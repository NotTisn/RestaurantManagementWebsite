import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    collectionGroup,
    query,
    orderBy,
    limit,
    startAfter,
    endBefore,
    limitToLast,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    where,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import styles from './CommentManagement.module.css';

// Material-UI components
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Rating from '@mui/material/Rating';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// Icons
import CommentIcon from '@mui/icons-material/Comment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';

const COMMENTS_PER_PAGE = 8;

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function CommentManagement() {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [lastVisible, setLastVisible] = useState(null);
    const [firstVisible, setFirstVisible] = useState(null);
    const [hasMoreNext, setHasMoreNext] = useState(false);
    const [hasMorePrev, setHasMorePrev] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const unsubscribeRef = useRef(null);

    const setupCommentsListener = useCallback(async (direction = 'initial', startDoc = null, pageNumber = 0, statusFilter = 'all') => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        setLoading(true);
        setError(null);
        setComments([]);
        // Reset lastVisible và firstVisible khi thiết lập listener mới để tránh lỗi `startAt` từ lần trước
        setLastVisible(null);
        setFirstVisible(null);
        setHasMoreNext(false); // Reset cờ để kiểm tra lại
        setHasMorePrev(false); // Reset cờ để kiểm tra lại

        let qRef = collectionGroup(db, 'FoodComments');
        const queryConstraints = [];

        if (statusFilter !== 'all') {
            queryConstraints.push(where('moderationStatus', '==', statusFilter));
        }

        queryConstraints.push(orderBy('timestamp', 'desc'));

        if (direction === 'next' && startDoc) {
            queryConstraints.push(startAfter(startDoc));
            queryConstraints.push(limit(COMMENTS_PER_PAGE));
        } else if (direction === 'prev' && startDoc) {
            queryConstraints.push(endBefore(startDoc));
            queryConstraints.push(limitToLast(COMMENTS_PER_PAGE));
        } else {
            queryConstraints.push(limit(COMMENTS_PER_PAGE));
        }
        
        const q = query(qRef, ...queryConstraints);

        const newUnsubscribe = onSnapshot(q, async (snapshot) => {
            const commentsData = [];
            if (snapshot.empty) {
                setComments([]);
                setLastVisible(null);
                setFirstVisible(null);
                setHasMoreNext(false);
                setHasMorePrev(pageNumber > 0); // Vẫn có thể quay lại trang trước nếu pageNumber > 0
                setLoading(false);
                return;
            }

            // Cập nhật lastVisible và firstVisible
            setFirstVisible(snapshot.docs[0]);
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

            snapshot.forEach((docSnap) => {
                const d = docSnap.data();
                let formattedTimestamp = 'N/A';
                if (d.timestamp instanceof Timestamp) {
                    formattedTimestamp = d.timestamp.toDate().toLocaleString();
                } else if (typeof d.timestamp === 'number') {
                    formattedTimestamp = new Date(d.timestamp).toLocaleString();
                }

                commentsData.push({
                    id: docSnap.id,
                    foodId: docSnap.ref.parent.parent.id,
                    userId: d.userId,
                    userName: d.userName,
                    text: d.text,
                    rating: d.rating,
                    timestamp: formattedTimestamp,
                    moderationStatus: d.moderationStatus || 'approved'
                });
            });

            if (direction === 'prev') {
                commentsData.reverse();
            }
            setComments(commentsData);

            // Kiểm tra xem còn trang tiếp theo không
            // Chỉ chạy query kiểm tra next nếu snapshot hiện tại có đủ số lượng COMMENTS_PER_PAGE
            if (snapshot.docs.length === COMMENTS_PER_PAGE) {
                let checkNextQRef = collectionGroup(db, 'FoodComments');
                const checkNextConstraints = [];
                if (statusFilter !== 'all') {
                    checkNextConstraints.push(where('moderationStatus', '==', statusFilter));
                }
                checkNextConstraints.push(orderBy('timestamp', 'desc'));
                checkNextConstraints.push(startAfter(snapshot.docs[snapshot.docs.length - 1]));
                checkNextConstraints.push(limit(1));

                const checkNextQuery = query(checkNextQRef, ...checkNextConstraints);
                
                try {
                    const nextSnapshot = await getDocs(checkNextQuery);
                    setHasMoreNext(!nextSnapshot.empty);
                } catch (nextError) {
                    console.warn("Error checking for next page, assuming no more pages:", nextError);
                    setHasMoreNext(false);
                }
            } else {
                setHasMoreNext(false);
            }

            // Kiểm tra xem còn trang trước đó không
            setHasMorePrev(pageNumber > 0);
            setLoading(false);
        }, (onSnapshotError) => {
            console.error("Error setting up onSnapshot listener for comments:", onSnapshotError);
            setError(`Error fetching comments: ${onSnapshotError.message}. Please ensure required Firestore indexes are created for your queries.`);
            setLoading(false);
        });

        unsubscribeRef.current = newUnsubscribe;

    }, []);

    useEffect(() => {
        setCurrentPage(0);
        setupCommentsListener('initial', null, 0, selectedStatus);

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [setupCommentsListener, selectedStatus]);

    const handleNextPage = () => {
        // Chỉ đi tiếp nếu lastVisible đã được set và không đang tải
        if (lastVisible && !loading) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            setupCommentsListener('next', lastVisible, nextPage, selectedStatus);
        } else {
            console.log("Cannot go next: lastVisible is null or loading", { lastVisible, loading });
        }
    };

    const handlePrevPage = () => {
        // Chỉ lùi lại nếu firstVisible đã được set, không đang tải, và không phải trang đầu tiên
        if (firstVisible && currentPage > 0 && !loading) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            setupCommentsListener('prev', firstVisible, prevPage, selectedStatus);
        } else {
            console.log("Cannot go prev: firstVisible is null, current page is 0, or loading", { firstVisible, currentPage, loading });
        }
    };

    const handleModerationChange = async (commentToUpdate, newStatus) => {
        const commentRef = doc(db, 'comments', commentToUpdate.foodId, 'FoodComments', commentToUpdate.id);
        try {
            await updateDoc(commentRef, { moderationStatus: newStatus });

            setComments(prevComments => {
                const updatedComments = prevComments.map(c =>
                    c.id === commentToUpdate.id
                        ? { ...c, moderationStatus: newStatus }
                        : c
                );
                // Sau khi cập nhật, lọc lại để chỉ hiển thị những comment khớp với status của tab hiện tại
                return updatedComments.filter(c => selectedStatus === 'all' || c.moderationStatus === selectedStatus);
            });

            setSnackbarMessage(`Comment ID ${commentToUpdate.id} updated to ${newStatus}.`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (updateError) {
            console.error("Error updating comment moderation status:", updateError);
            setSnackbarMessage(`Failed to update comment status: ${updateError.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleDeleteComment = async (commentToDelete) => {
        if (!window.confirm(`Are you sure you want to delete this comment from ${commentToDelete.userName} on Food ID: ${commentToDelete.foodId}?`)) {
            return;
        }

        const commentRef = doc(db, 'comments', commentToDelete.foodId, 'FoodComments', commentToDelete.id);
        try {
            await deleteDoc(commentRef);

            setComments(prevComments => prevComments.filter(c => c.id !== commentToDelete.id));

            setSnackbarMessage(`Comment ID ${commentToDelete.id} deleted successfully.`);
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (deleteError) {
            console.error("Error deleting comment:", deleteError);
            setSnackbarMessage(`Failed to delete comment: ${deleteError.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const getStatusDisplay = (status) => {
        switch (status) {
            case 'approved': return <span className={styles.statusApproved}><CheckCircleOutlineIcon fontSize="small" /> Approved</span>;
            case 'rejected': return <span className={styles.statusRejected}><CancelIcon fontSize="small" /> Rejected</span>;
            case 'pending': return <span className={styles.statusPending}>Pending</span>;
            default: return <span>{status}</span>;
        }
    };

    const handleStatusTabChange = (event, newStatus) => {
        if (newStatus !== null) {
            setSelectedStatus(newStatus);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.heading}><CommentIcon sx={{ mr: 1 }} /> Customer Comments Management</h1>
            </div>

            <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
                <ToggleButtonGroup
                    value={selectedStatus}
                    exclusive
                    onChange={handleStatusTabChange}
                    aria-label="comment status filter"
                    color="primary"
                >
                    <ToggleButton value="all" aria-label="all comments">
                        <AllInclusiveIcon sx={{ mr: 1 }} /> All
                    </ToggleButton>
                    <ToggleButton value="approved" aria-label="approved comments">
                        <CheckCircleOutlineIcon sx={{ mr: 1 }} /> Approved
                    </ToggleButton>
                    <ToggleButton value="rejected" aria-label="rejected comments">
                        <CancelIcon sx={{ mr: 1 }} /> Rejected
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {error && (
                <Box sx={{ my: 2, p: 2, backgroundColor: '#ffebee', color: '#d32f2f', borderRadius: '8px' }}>
                    <Typography variant="body1">
                        <strong>Error:</strong> {error}
                    </Typography>
                </Box>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                    <CircularProgress size={50} />
                    <Typography variant="h6" sx={{ mt: 2 }}>Loading Comments...</Typography>
                </Box>
            ) : (
                <>
                    {comments.length === 0 && !error ? (
                        <Typography variant="h6" sx={{ textAlign: 'center', mt: 4 }}>
                            No comments found for this status.
                        </Typography>
                    ) : (
                        <div className={styles.commentsGrid}>
                            {comments.map((comment) => (
                                <div key={comment.id} className={styles.commentCard}>
                                    <div className={styles.commentHeader}>
                                        <Typography variant="subtitle1" className={styles.userName}>
                                            <strong>{comment.userName}</strong>
                                        </Typography>
                                        <Rating
                                            name="read-only-rating"
                                            value={comment.rating}
                                            precision={0.5}
                                            readOnly
                                            size="small"
                                        />
                                    </div>
                                    <Typography variant="body2" className={styles.commentText}>
                                        "{comment.text}"
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" className={styles.commentTime}>
                                        at {comment.timestamp} for Food ID: {comment.foodId}
                                    </Typography>

                                    <div className={styles.moderationSection}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            Status: {getStatusDisplay(comment.moderationStatus)}
                                        </Typography>
                                        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
                                            <InputLabel id={`status-select-label-${comment.id}`}>Change Status</InputLabel>
                                            <Select
                                                labelId={`status-select-label-${comment.id}`}
                                                id={`status-select-${comment.id}`}
                                                value={comment.moderationStatus}
                                                label="Change Status"
                                                onChange={(e) => handleModerationChange(comment, e.target.value)}
                                            >
                                                <MenuItem value="approved">Approved</MenuItem>
                                                <MenuItem value="rejected">Rejected</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteComment(comment)}
                                            sx={{ mt: 1 }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3, gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={handlePrevPage}
                            disabled={!hasMorePrev || loading}
                        >
                            Previous
                        </Button>
                        <Typography variant="body1" sx={{ alignSelf: 'center' }}>
                            Page {currentPage + 1}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={handleNextPage}
                            disabled={!hasMoreNext || loading}
                        >
                            Next
                        </Button>
                    </Box>
                </>
            )}

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </div>
    );
}

export default CommentManagement;