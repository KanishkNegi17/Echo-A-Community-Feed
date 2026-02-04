from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentListCreateView, VoteView, LeaderboardView

router = DefaultRouter()
router.register(r'posts', PostViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Nested comments endpoint: /posts/{id}/comments/
    path('posts/<int:post_id>/comments/', CommentListCreateView.as_view(), name='post-comments'),
    
    # Voting endpoint: /vote/{id}/
    path('vote/<int:pk>/', VoteView.as_view(), name='vote'),
    
    # Leaderboard
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
]