import os
import django
import random
from datetime import timedelta
from django.utils import timezone

# 1. Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from feed.models import Post, Comment, Vote

def run():
    print("--- Starting Database Population ---")

    # 2. Create Users
    usernames = ['alice', 'bob', 'charlie', 'david', 'eve', 'frank']
    users = []
    for username in usernames:
        user, created = User.objects.get_or_create(username=username)
        if created:
            user.set_password('password123') # Default password
            user.save()
            print(f"Created user: {username}")
        else:
            print(f"User {username} already exists")
        users.append(user)

    # 3. Create Main Post (ID 1)
    # We ensure ID 1 exists because the Frontend has it hardcoded
    main_author = users[0] # Alice
    post, created = Post.objects.get_or_create(
        id=1,
        defaults={
            'author': main_author, 
            'content': "This is the main discussion thread for our Community Feed prototype! Let's test the N+1 optimization and concurrency here."
        }
    )
    print(f"Post ensured: {post.content[:30]}...")

    # 4. Create Nested Comment Structure (The N+1 Test)
    # Root Comment
    root_comment = Comment.objects.create(
        post=post,
        author=users[1], # Bob
        content="This is a root level comment. Reply to me!"
    )
    
    # Level 1 Reply
    reply_1 = Comment.objects.create(
        post=post,
        author=users[2], # Charlie
        content="I am replying to the root comment.",
        parent=root_comment
    )

    # Level 2 Reply (Nested)
    reply_2 = Comment.objects.create(
        post=post,
        author=users[3], # David
        content="I am replying to Charlie. This tests the recursion depth.",
        parent=reply_1
    )

    print("Created nested comment tree (Root -> Level 1 -> Level 2)")

    # 5. Populate Votes (The Leaderboard Test)
    print("Simulating Votes for Leaderboard...")
    
    # Clear old votes to ensure clean leaderboard test
    Vote.objects.all().delete()

    # Logic:
    # Alice (users[0]): Gets 2 post likes (10 pts) + 1 comment like (1 pt) = 11 pts
    # Bob (users[1]): Gets 5 comment likes = 5 pts
    # Charlie (users[2]): Gets 1 comment like = 1 pt

    # Alice's Points
    Vote.objects.create(voter=users[1], post=post) # Bob likes Alice's post (+5)
    Vote.objects.create(voter=users[2], post=post) # Charlie likes Alice's post (+5)
    Vote.objects.create(voter=users[1], comment=reply_2) # Bob likes Alice's reply (Wait, let's make a reply for Alice first)
    
    alice_reply = Comment.objects.create(post=post, author=users[0], content="Thanks guys!", parent=root_comment)
    Vote.objects.create(voter=users[2], comment=alice_reply) # Charlie likes Alice's comment (+1)

    # Bob's Points
    for i in range(2, 6): # Users 2,3,4,5 like Bob's root comment
        Vote.objects.create(voter=users[i], comment=root_comment)

    print("--- Database Populated Successfully ---")
    print(f"Login with: {usernames[1]} / password123")

if __name__ == '__main__':
    run()