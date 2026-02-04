# 🧠 Technical Explainer & AI Audit

This document breaks down the "hidden" engineering choices in **Echo**—specifically how I handled the tricky performance constraints and where I had to correct the AI's logic.

---

## 🌳 The Tree: Handling Nested Comments without the Lag

### 1. The Database Strategy
I went with the **Adjacency List** pattern (just a simple `parent_id` on the Comment model).
* **Why?** While things like MPTT or CTEs are cool, they are overkill for a prototype. A self-referencing ForeignKey is standard, easy to index, and keeps writes incredibly fast (O(1)).

### 2. Solving the "N+1 Nightmare"
The biggest trap with threaded comments is fetching them. The naive way (looping through children in the serializer) kills the DB because it fires a new query for every single reply. For 50 comments, that's 51 queries.

**My Fix (The "One-Shot" Fetch):**
I moved the logic out of the DB and into Python memory.
1.  **Fetch:** I grab **every** comment for the post in exactly **one** database query:
    ```python
    comments = Comment.objects.filter(post_id=post_id).select_related('author')
    ```
2.  **Stitch:** I loop through that list once in Python. I use a dictionary to map IDs to objects, and then I manually append children to their parents' `prefetched_replies` list.
3.  **Result:** No matter how deep the thread goes, the database is only touched once.

---

## 🧮 The Math: The 24h Dynamic Leaderboard

The requirement was tricky: calculate "Karma" from the last 24 hours *without* storing a score on the User model. If we did this in Python loops, it would be slow. I pushed the math into the SQL layer using Django Aggregations.

### The QuerySet Logic
I used `Case/When` (which acts like an `IF` statement inside the DB) to sum up points dynamically.

```python
# The Logic:
# 1. Filter votes older than 24h.
# 2. If it's a Post vote, add 5. If it's a Comment vote, add 1.
# 3. Sum it up and group by User.

top_users = Vote.objects.filter(created_at__gte=last_24h).values('voter__username').annotate(
    score=Sum(
        Case(
            When(post__isnull=False, then=5),    # +5 for Posts
            When(comment__isnull=False, then=1), # +1 for Comments
            default=0,
            output_field=IntegerField()
        )
    )
).order_by('-score')[:5]
```

---

## 🤖 The AI Audit: Where Human Engineering Took Over

I utilized AI to generate boilerplate code, but I treated it as a junior developer: capable of writing syntax, but blind to architecture. I had to intervene in three critical areas where the AI's "default" approach would have failed in production.

### 1. Frontend Architecture: The "Silent" Leaderboard
The AI generated the `CommentItem` and `Leaderboard` as completely isolated components.
* **The Flaw:** When I clicked "Like" on a comment, the button turned blue locally, but the **Leaderboard** (which lives in a separate sidebar) remained frozen. The AI failed to manage state across the component tree.
* **My Fix:** I implemented **Callback Prop Drilling** to bridge the gap.
    1.  I created a `refreshLeaderboard` function in the top-level `App.jsx`.
    2.  I passed this function down into the post, and critically, through the *recursive* comment children.
* **Result:** Now, liking a comment 3 levels deep instantly triggers a refresh of the global Leaderboard.

### 2. User Experience: The "Laggy" Interface
The AI wrote a standard handler that waited for the server response before updating the UI: `await api.post(...)` $\rightarrow$ `then setLiked(true)`.
* **The Flaw:** This creates a generic "laggy" feel. On slow networks, the user clicks the heart and nothing happens for half a second, making the app feel broken.
* **My Fix:** I implemented **Optimistic UI Updates**.
    1.  I assume the request will succeed and update the local state **instantly** (`setLiked(!liked)`).
    2.  I send the API request in the background. If (and only if) it fails, I revert the change and show an error toast.
* **Result:** The interaction feels instantaneous and native, regardless of network speed.
