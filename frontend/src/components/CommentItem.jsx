import React, { useState } from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import api from '../api';

const CommentItem = ({ comment, onReply, onVoteSuccess}) => {
  const [liked, setLiked] = useState(comment.user_has_liked);
  const [likesCount, setLikesCount] = useState(comment.likes_count);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleLike = async () => {
    // 1. Determine the new state (Toggle)
    const newLikedState = !liked;
    
    // 2. Optimistic UI Update (Instant feedback)
    setLiked(newLikedState);
    setLikesCount((prev) => newLikedState ? prev + 1 : prev - 1); // Increment if liking, Decrement if unliking

    try {
      // 3. Send request to backend
      // The backend toggle logic: If vote exists, it deletes it. If not, it creates it.
      await api.post(`vote/${comment.id}/`, { type: 'comment' });

      if (onVoteSuccess){
        onVoteSuccess();
      }
    } catch (error) {
      // 4. Revert if server fails
      console.error("Like toggle failed:", error);
      setLiked(!newLikedState);
      setLikesCount((prev) => newLikedState ? prev - 1 : prev + 1);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent);
    setIsReplying(false);
    setReplyContent('');
  };

  return (
    <div className="border-l-2 border-gray-200 pl-4 mt-4">
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex justify-between items-start">
          <span className="font-semibold text-sm text-gray-800">{comment.author_username}</span>
          <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        
        <p className="mt-1 text-gray-700">{comment.content}</p>

        {/* Action Bar */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1 hover:text-blue-600 transition ${liked ? 'text-blue-600 font-bold' : ''}`}
          >
            <ThumbsUp size={14} className={liked ? "fill-current" : ""} />
            <span>{likesCount} Likes</span>
          </button>
          
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 hover:text-blue-600 transition"
          >
            <MessageSquare size={14} />
            <span>Reply</span>
          </button>
        </div>

        {/* Reply Input Box */}
        {isReplying && (
          <form onSubmit={submitReply} className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-3 py-1 text-sm border rounded focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded">
              Send
            </button>
          </form>
        )}
      </div>

      {/* Recursion */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onReply={onReply} onVoteSuccess={onVoteSuccess}  />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;