from rest_framework import viewsets, generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Count, Sum, Case, When, IntegerField, F
from django.db import transaction, IntegrityError
from django.utils import timezone
from datetime import timedelta
from .models import Post, Comment, Vote
from .serializers import PostSerializer, CommentSerializer
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class PostPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'

    def get_paginated_response(self, data):
        # Return only the paginated list, not count/next/previous
        return Response(data)


class PostViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for Posts.
    Optimization: We use 'prefetch_related' for the 'votes' generic relation is too heavy here.
    Instead, we rely on the generic 'votes.count()' which is fast, 
    but for high scale, we would annotate this in the query.
    """
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = PostPagination 
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # We filter by post_id to narrow the scope immediately
        return Comment.objects.filter(post_id=self.kwargs['post_id'])

    def list(self, request, *args, **kwargs):
        """
        SOLVING THE N+1 NIGHTMARE:
        Instead of recursively fetching replies, we fetch ALL comments for this post
        in a SINGLE query. We then reconstruct the tree in Python memory (O(n)).
        """
        post_id = self.kwargs['post_id']
        
        # 1. Fetch flat list from DB (1 Query)
        # Select_related author to avoid N+1 on author username lookup
        queryset = Comment.objects.filter(post_id=post_id).select_related('author')
        
        # 2. Convert to Python objects
        comments = list(queryset)
        
        # 3. Create a lookup dictionary: ID -> Comment Object
        comment_dict = {c.id: c for c in comments}
        
        # 4. Initialize 'prefetched_replies' list on all objects
        for c in comments:
            c.prefetched_replies = []

        # 5. Build the Tree (O(n) Linear Pass)
        # We iterate through the list. If a comment has a parent, we append it 
        # to the parent's 'prefetched_replies' list using the reference in comment_dict.
        root_comments = []
        for c in comments:
            if c.parent_id:
                parent = comment_dict.get(c.parent_id)
                if parent:
                    parent.prefetched_replies.append(c)
            else:
                root_comments.append(c)

        # 6. Serialize only the root comments. 
        # The Serializer is defined to look at 'prefetched_replies' recursively.
        serializer = self.get_serializer(root_comments, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        post = Post.objects.get(pk=self.kwargs['post_id'])
        serializer.save(author=self.request.user, post=post)

class VoteView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """
        Handles voting toggle (Like/Unlike).
        Uses Atomic Transactions to ensure data integrity during race conditions.
        """
        vote_type = request.data.get('type') # 'post' or 'comment'
        user = request.user

        try:
            with transaction.atomic():
                if vote_type == 'post':
                    post = Post.objects.get(pk=pk)
                    vote, created = Vote.objects.get_or_create(voter=user, post=post)
                    if not created:
                        vote.delete() # Toggle off
                        return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
                
                elif vote_type == 'comment':
                    comment = Comment.objects.get(pk=pk)
                    vote, created = Vote.objects.get_or_create(voter=user, comment=comment)
                    if not created:
                        vote.delete() # Toggle off
                        return Response({'status': 'unliked'}, status=status.HTTP_200_OK)
                
                return Response({'status': 'liked'}, status=status.HTTP_201_CREATED)

        except IntegrityError:
            # Captures race conditions where unique constraint is violated
            return Response({'error': 'Already voted'}, status=status.HTTP_400_BAD_REQUEST)

class LeaderboardView(views.APIView):
    def get(self, request):
        """
        COMPLEX AGGREGATION:
        We need to sum Karma from the last 24 hours.
        Logic: 
        1. Filter Votes created > 24 hours ago.
        2. Conditional Sum: If vote is for Post +5, if Comment +1.
        3. Group by User.
        """
        last_24h = timezone.now() - timedelta(hours=24)
        
        # Django ORM Magic:
        # We annotate each user with a 'karma_score' calculated on the fly.
        top_users = Vote.objects.filter(created_at__gte=last_24h).values('voter__username').annotate(
            score=Sum(
                Case(
                    When(post__isnull=False, then=5),
                    When(comment__isnull=False, then=1),
                    default=0,
                    output_field=IntegerField()
                )
            )
        ).order_by('-score')[:5] # Top 5
        
        return Response(top_users)

@api_view(['POST'])
@permission_classes([AllowAny]) # Allow anyone to access this (no token needed)
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and Password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    # create_user automatically hashes the password
    user = User.objects.create_user(username=username, password=password)
    
    return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)