import React, { useEffect, useState } from 'react';
import api from './api';
import CommentItem from './components/CommentItem';
import { Trophy, ThumbsUp, MessageSquare, LogOut, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import {Toaster, toast} from 'react-hot-toast';

// --- INTERNAL COMPONENT: SINGLE POST CARD ---
// This handles the logic for ONE post in the feed (Likes, Fetching Comments, Replying)
const PostCard = ({ initialPost, onVoteSuccess }) => {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  // Reply State
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // 1. Handle Post Like
  const handlePostLike = async () => {
    const newLikedState = !post.user_has_liked;
    
    // Optimistic Update
    setPost((prev) => ({
      ...prev,
      user_has_liked: newLikedState,
      likes_count: newLikedState ? prev.likes_count + 1 : prev.likes_count - 1
    }));

    try {
      await api.post(`vote/${post.id}/`, { type: 'post' });
      onVoteSuccess(); // Refresh leaderboard
    } catch (err) {
      // Revert if failed
      setPost((prev) => ({
        ...prev,
        user_has_liked: !newLikedState,
        likes_count: newLikedState ? prev.likes_count - 1 : prev.likes_count + 1
      }));
    }
  };

  // 2. Fetch Comments (Only when toggled open)
  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await api.get(`posts/${post.id}/comments/`);
        setComments(res.data);
      } catch (err) {
        console.error("Failed to load comments");
      } finally {
        setIsLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  // 3. Handle Reply Submission
  const handleReply = async (parentId, content) => {
    try {
      await api.post(`posts/${post.id}/comments/`, {
        content,
        parent: parentId 
      });
      // Refresh comments for this post
      const res = await api.get(`posts/${post.id}/comments/`);
      setComments(res.data);
      return true;
    } catch (err) {
      // alert("Failed to post reply");
      toast.error("Failed to post reply")
      return false;
    }
  };

  const submitPostReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    const success = await handleReply(null, replyContent); 
    if (success) {
      setIsReplying(false);
      setReplyContent('');
      toast.success("Replied ")
      if (!showComments) toggleComments(); // Auto-open comments to show the new one
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100 mb-6 transition hover:shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-900">{post.author_username}</h3>
          <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-800 text-lg leading-relaxed mb-4">{post.content}</p>

      {/* Action Bar */}
      <div className="flex items-center gap-4 text-gray-500 border-t pt-4">
        <button 
          onClick={handlePostLike}
          className={`flex items-center gap-2 hover:text-blue-600 transition px-2 py-1 rounded ${post.user_has_liked ? 'text-blue-600 font-bold bg-blue-50' : ''}`}
        >
          <ThumbsUp size={18} className={post.user_has_liked ? "fill-current" : ""} /> 
          {post.likes_count}
        </button>

        <button 
          onClick={toggleComments}
          className={`flex items-center gap-2 hover:text-blue-600 transition px-2 py-1 rounded ${showComments ? 'text-blue-600 bg-blue-50' : ''}`}
        >
          <MessageSquare size={18} />
          {comments.length > 0 ? comments.length : ''} Comments
          {showComments ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button 
          onClick={() => setIsReplying(!isReplying)}
          className="flex items-center gap-2 hover:text-blue-600 transition px-2 py-1 rounded ml-auto text-sm"
        >
          Reply
        </button>
      </div>

      {/* Reply Input (Directly to Post) */}
      {isReplying && (
        <form onSubmit={submitPostReply} className="mt-4 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a comment..."
            autoFocus
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
            Post
          </button>
        </form>
      )}

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50/50 rounded-b-lg -mx-6 px-6 pb-2">
          {isLoadingComments ? (
            <div className="text-center text-gray-400 text-sm py-2">Loading discussion...</div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onReply={handleReply} 
                onVoteSuccess={onVoteSuccess} 
              />
            ))
          ) : (
            <p className="text-gray-400 text-sm italic text-center py-2">No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
};


// --- MAIN APP COMPONENT ---
function App() {
  const [posts, setPosts] = useState([]); // Changed from 'post' to 'posts' (Array)
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // UI State: Creating a New Global Post
  const [isPosting, setIsPosting] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setPosts([]);
    setLeaderboard([]);
    toast.success("You have successfully logged out!")
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('token/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      setToken(res.data.access);
      toast.success(`Welcome back, ${username}`)
    } catch (err) {
      // alert('Login failed. Check credentials.');
      console.error('Login error:', err);
      // Always show a toast for any error
      const message =
      err.response?.status === 401
      ? 'Login Failed. Check Credentials'
      : err.response?.data?.detail || 'Login Failed. Something went wrong';
      // Wrap in setTimeout to ensure React processes it after render
      setTimeout(() => toast.error(message), 0);
    }
  };

  // --- DATA FETCHING ---
  const refreshLeaderboard = async () => {
    try {
      const lbRes = await api.get('leaderboard/');
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error("Failed to refresh leaderboard");
    }
  };

  const fetchFeed = async () => {
    try {
      // 1. Fetch ALL posts
      const postsRes = await api.get('posts/');
      setPosts(postsRes.data);
      
      // 2. Fetch Leaderboard
      const lbRes = await api.get('leaderboard/');
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error("Error fetching feed:", err);
      if (err.response && err.response.status === 401) logout();
    }
  };

  useEffect(() => {
    if (token) fetchFeed();
  }, [token]);

  // --- CREATE POST ACTION ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    try {
      await api.post('posts/', { content: newPostContent });
      setIsPosting(false);
      setNewPostContent('');
      // Reload the feed to show the new post at the top
      fetchFeed();
      toast.success("Post created successfully!");
    } catch (err) {
      // alert("Failed to create post");
      toast.error('Failed To Create Post')
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('register/', { username, password });
      toast.success("Account created! Please log in.");
      setIsRegistering(false); // Switch back to login mode so they can sign in
    } catch (err) {
      // Check if the backend sent a specific error message
      if (err.response && err.response.data && err.response.data.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Registration failed. Try a different username.");
      }
    }
  };

  //////////////// CHANGED REGISTER

  if (!token) {
    return (
      <div className="flex h-screen justify-center items-center bg-gray-100 flex-col">
        <Toaster position="top-center" />
        <div className="bg-white p-8 rounded shadow-md w-80">
          <h2 className="text-xl font-bold mb-6 text-center text-gray-800">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          
          <form onSubmit={isRegistering ? handleRegister : login}>
            <input 
              className="w-full mb-3 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)} 
            />
            <input 
              className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
            />
            
            <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition font-medium">
              {isRegistering ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">
              {isRegistering ? "Already have an account? " : "New to ECHO? "}
            </span>
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setUsername(''); // Clear fields for better UX
                setPassword('');
              }}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  //////////////////////////////////////// CHANGED 

  // --- RENDER: FEED ---
  return (
    <div className="min-h-screen bg-gray-100">
      
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold text-blue-600">Echo : A CommunityFeed</h1>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPosting(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={18} /> Create Post
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          <button onClick={logout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition font-medium text-sm">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>

      <div className="p-8 flex gap-8 justify-center items-start max-w-6xl mx-auto">
        
        {/* LEFT COLUMN: THE FEED */}
        <div className="w-full max-w-2xl">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                initialPost={post} 
                onVoteSuccess={refreshLeaderboard} 
              />
            ))
          ) : (
            <div className="text-center text-gray-500 mt-10">
              <p>No posts yet. Be the first to create one!</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LEADERBOARD */}
        <div className="w-80 bg-white p-6 rounded-lg shadow border border-gray-100 sticky top-24">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b">
            <Trophy className="text-yellow-500" />
            <h2 className="text-lg font-bold text-gray-900">24h Leaders</h2>
          </div>
          <ul className="space-y-4">
            {leaderboard.length === 0 ? (
              <li className="text-gray-400 text-sm italic text-center py-4">No activity in the last 24h</li>
            ) : (
              leaderboard.map((user, index) => (
                <li key={index} className="flex justify-between items-center group">
                  <span className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' :
                      index === 1 ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-300' :
                      index === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-700 group-hover:text-blue-600 transition">{user.voter__username}</span>
                  </span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">{user.score} pts</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />

      {/* CREATE POST MODAL */}
      {isPosting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Create New Post</h2>
              <button onClick={() => setIsPosting(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreatePost} className="p-6">
              <textarea
                className="w-full h-32 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
                placeholder="What do you want to share?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsPosting(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md">Post to Feed</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
  
}

export default App;