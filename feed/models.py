from django.db import models
from django.contrib.auth.models import User
from django.db.models import UniqueConstraint

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at}"

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    # Adjacency List: Points to itself. Null means it's a top-level comment.
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username}"

class Vote(models.Model):
    """
    Acts as a ledger for Karma.
    We don't store a 'score' on the User model. We calculate it by summing these records.
    """
    VOTE_TYPE_POST = 'POST'
    VOTE_TYPE_COMMENT = 'COMMENT'
    
    # Who cast the vote?
    voter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes_cast')
    
    # What did they vote on? (Generic relations are complex, explicit FKs are cleaner for this scale)
    post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.CASCADE, related_name='votes')
    comment = models.ForeignKey(Comment, null=True, blank=True, on_delete=models.CASCADE, related_name='votes')
    
    # When did it happen? (Crucial for the "Last 24 Hours" requirement)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # Constraint 1: User can only like a specific Post once
            UniqueConstraint(
                fields=['voter', 'post'], 
                condition=models.Q(post__isnull=False),
                name='unique_post_like'
            ),
            # Constraint 2: User can only like a specific Comment once
            UniqueConstraint(
                fields=['voter', 'comment'], 
                condition=models.Q(comment__isnull=False),
                name='unique_comment_like'
            )
        ]

    def save(self, *args, **kwargs):
        # Validation: Ensure a vote is EITHER for a post OR a comment, not both/neither
        if self.post and self.comment:
            raise ValueError("Cannot vote on both Post and Comment simultaneously.")
        if not self.post and not self.comment:
            raise ValueError("Vote must target a Post or Comment.")
        super().save(*args, **kwargs)

    @property
    def karma_value(self):
        # 5 Karma for Posts, 1 for Comments
        if self.post:
            return 5
        return 1