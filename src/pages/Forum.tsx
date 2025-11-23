import { useState, useEffect } from "react";
import {
  ThumbsUp,
  MessageCircle,
  Eye,
  Send,
  Paperclip,
  Image,
  MoreVertical,
} from "lucide-react";
import styles from "./Forum.module.css";

// Types
interface Author {
  name: string;
  role: string;
  avatar: string;
}

interface PostStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

interface Post {
  id: string;
  author: Author;
  timestamp: string;
  title: string;
  content: string;
  stats: PostStats;
}

interface CommentStats {
  likes: number;
  comments: number;
  shares: number;
}

interface Comment {
  id: string;
  author: Author;
  timestamp: string;
  content: string;
  stats: CommentStats;
}

// Mock data structure - replace with actual ICP canister calls
const mockPost: Post = {
  id: "1",
  author: {
    name: "Tom Gross",
    role: "Manager from XYZ",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tom",
  },
  timestamp: "1 hour",
  title: "Welcome to The Flower Bloom posts",
  content:
    "Lorem ipsum dolor sit amet consectetur. Egestas risus ullamcorper aliquam iaculis massa scelerisque quis quis turpis. Donec dictumst urna tincidunt nulla. Amet auctor non urna mauris lectus amet ultrices nibh quis. Commodo aenean faucibus nulla laoreet ac nullam nunc. Venenatis eu pellentesque ornare risus posuere donec. Arcu lorem velit a tristique. Nulla laoreet id blandit egestas sed. Blandit eget platea nunc at pharetra porttitor.",
  stats: {
    views: 750,
    likes: 3500,
    comments: 216,
    shares: 3209,
  },
};

const mockComments: Comment[] = [
  {
    id: "1",
    author: {
      name: "Sam Joy",
      role: "Manager from XYZ",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
    },
    timestamp: "18 minutes",
    content:
      "Lorem ipsum dolor sit amet consectetur. Egestas risus ullamcorper aliquam iaculis massa scelerisque quis quis turpis. Donec dictumst urna tincidunt nulla. Amet auctor non urna mauris lectus amet ultrices nibh quis. Commodo aenean faucibus nulla laoreet ac nullam nunc. Venenatis eu pellentesque ornare risus posuere donec.",
    stats: {
      likes: 1200,
      comments: 704,
      shares: 1000,
    },
  },
  {
    id: "2",
    author: {
      name: "Justin Hua",
      role: "Manager from XYZ",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Justin",
    },
    timestamp: "22 minutes",
    content:
      "Lorem ipsum dolor sit amet consectetur. Egestas risus ullamcorper aliquam iaculis massa scelerisque quis quis turpis. Donec dictumst urna tincidunt nulla. Amet auctor non urna mauris lectus amet ultrices nibh quis. Commodo aenean faucibus nulla laoreet ac nullam nunc. Venenatis eu pellentesque ornare risus posuere donec.",
    stats: {
      likes: 7801,
      comments: 1070,
      shares: 4952,
    },
  },
];

const Forum = () => {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostData();
  }, []);

  const fetchPostData = async () => {
    try {
      // TODO: Replace with actual ICP canister call
      // Example:
      // const actor = await getCanisterActor();
      // const postData = await actor.getPost(postId);
      // const commentsData = await actor.getComments(postId);

      setTimeout(() => {
        setPost(mockPost);
        setComments(mockComments);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error fetching post data:", error);
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    try {
      // TODO: Replace with actual ICP canister call
      // Example:
      // const actor = await getCanisterActor();
      // await actor.addComment(post.id, commentText);

      console.log("Sending comment:", commentText);
      setCommentText("");
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Post not found</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Post</h1>
        </div>

        {/* Post Card */}
        <div className={styles.postCard}>
          {/* Author Info */}
          <div className={styles.authorHeader}>
            <div className={styles.authorInfo}>
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className={styles.avatar}
              />
              <div>
                <h3 className={styles.authorName}>{post.author.name}</h3>
                <p className={styles.authorMeta}>
                  {post.author.role} · {post.timestamp}
                </p>
              </div>
            </div>
            <button className={styles.moreButton}>
              <MoreVertical size={20} />
            </button>
          </div>

          {/* Post Title */}
          <h2 className={styles.postTitle}>{post.title}</h2>

          {/* Post Content */}
          <div className={styles.postContent}>
            <p className={!isExpanded ? styles.contentCollapsed : ""}>
              {post.content}
            </p>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.seeMoreButton}
          >
            {isExpanded ? "See less" : "See more"}
          </button>

          {/* Post Stats */}
          <div className={styles.postStats}>
            <div className={styles.viewsCount}>
              <Eye size={16} />
              <span>{post.stats.views} views</span>
            </div>
            <div className={styles.statsBadges}>
              <div className={styles.statBadge}>
                <ThumbsUp size={14} />
                <span>{formatNumber(post.stats.likes)}</span>
              </div>
              <div className={styles.statBadge}>
                <MessageCircle size={14} />
                <span>{formatNumber(post.stats.comments)}</span>
              </div>
              <div className={styles.statBadge}>
                <span>🔗 {formatNumber(post.stats.shares)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className={styles.commentsSection}>
          <h2 className={styles.commentsTitle}>Comments</h2>

          {/* Comments List */}
          <div className={styles.commentsList}>
            {comments.map((comment) => (
              <div key={comment.id} className={styles.commentCard}>
                {/* Comment Author */}
                <div className={styles.commentAuthor}>
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className={styles.avatarSmall}
                  />
                  <div>
                    <h4 className={styles.authorName}>{comment.author.name}</h4>
                    <p className={styles.authorMeta}>
                      {comment.author.role} · {comment.timestamp}
                    </p>
                  </div>
                </div>

                {/* Comment Content */}
                <p className={styles.commentContent}>{comment.content}</p>

                {/* Comment Stats */}
                <div className={styles.commentStats}>
                  <div className={styles.commentStatBadge}>
                    <ThumbsUp size={12} />
                    <span>{formatNumber(comment.stats.likes)}</span>
                  </div>
                  <div className={styles.commentStatBadge}>
                    <MessageCircle size={12} />
                    <span>{formatNumber(comment.stats.comments)}</span>
                  </div>
                  <div className={styles.commentStatBadge}>
                    <span>🌿 {formatNumber(comment.stats.shares)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <div className={styles.commentInput}>
            <p className={styles.answeringTo}>
              You are answering to {post.author.name}
            </p>

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              className={styles.textarea}
            />

            <div className={styles.inputActions}>
              <div className={styles.attachmentButtons}>
                <button className={styles.iconButton}>
                  <Paperclip size={20} />
                </button>
                <button className={styles.iconButton}>
                  <Image size={20} />
                </button>
              </div>

              <div className={styles.submitActions}>
                <button
                  onClick={() => setCommentText("")}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim()}
                  className={styles.sendButton}
                >
                  SEND
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Comment Count Footer */}
          <div className={styles.commentFooter}>
            <div className={styles.avatarStack}>
              {comments.slice(0, 3).map((comment, idx) => (
                <img
                  key={idx}
                  src={comment.author.avatar}
                  alt={comment.author.name}
                  className={styles.avatarSmall}
                />
              ))}
            </div>
            <span className={styles.commentCount}>
              {comments.length} Comments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;