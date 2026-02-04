from rest_framework import serializers
from .models import Post, Comment, Vote

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    # We will compute 'replies' manually in the View to avoid N+1 recursion here
    replies = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'author_username', 'content', 'parent', 'created_at', 'replies', 'likes_count', 'user_has_liked']

    def get_replies(self, obj):
        # This is a placeholder. We will populate this in the View to be efficient.
        # If we did the recursion here, it would cause the N+1 problem.
        if hasattr(obj, 'prefetched_replies'):
            return CommentSerializer(obj.prefetched_replies, many=True, context=self.context).data
        return []

    def get_likes_count(self, obj):
        return obj.votes.count()

    def get_user_has_liked(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            # We will optimize this lookup in the view as well
            return obj.votes.filter(voter=user).exists()
        return False

class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    likes_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author_username', 'content', 'created_at', 'likes_count', 'user_has_liked']

    def get_likes_count(self, obj):
        return obj.votes.count()

    def get_user_has_liked(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return obj.votes.filter(voter=user).exists()
        return False