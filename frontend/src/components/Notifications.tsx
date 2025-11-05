// frontend/src/components/Notifications.tsx
import React, { useState } from 'react'; // Import React for SyntheticEvent type
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
    IconButton, Badge, Menu, MenuItem, ListItemText, ListItemIcon, Typography, Button, Box, CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CircleNotificationsIcon from '@mui/icons-material/CircleNotifications';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime'; // Keep if you switch back to relative time

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime); // Keep if needed

interface NotificationWithStatus {
    notification_id: string;
    display_message: string;
    timestamp: string;
    display_link?: string;
    type: string;
    subject_employee_id?: string;
    user_notification_id: string;
    read_status: boolean;
}

// API functions (keep definitions as they define mutation functions)
const fetchNotifications = async (): Promise<NotificationWithStatus[]> => (await api.get('/notifications/me')).data;
const markAsRead = async (userNotificationId: string): Promise<void> => (await api.put(`/notifications/${userNotificationId}/read`)).data;
const markAllAsRead = async (): Promise<void> => (await api.post('/notifications/read-all')).data;
const deleteNotification = async (userNotificationId: string): Promise<void> => (await api.delete(`/notifications/${userNotificationId}`)).data;

const Notifications = () => {
    const queryClient = useQueryClient(); // queryClient is used
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const { data: notifications, isLoading: isLoadingNotifications } = useQuery<NotificationWithStatus[]>({
        queryKey: ['notifications'],
        queryFn: fetchNotifications,
        refetchInterval: 30000,
    });

    // --- Corrected Mutations ---
    const readMutation = useMutation({
        mutationFn: markAsRead,
        // Correct onSuccess signature: receives data, variables, context
        onSuccess: (_data, variables) => {
             const userNotificationId = variables; // Get the ID from variables
             queryClient.setQueryData(['notifications'], (oldData: NotificationWithStatus[] | undefined) =>
                oldData?.map(n =>
                    n.user_notification_id === userNotificationId ? { ...n, read_status: true } : n
                ) ?? []
             );
        },
        onError: (error) => console.error("Failed to mark notification as read:", error)
    });

    const readAllMutation = useMutation({
        mutationFn: markAllAsRead,
         onSuccess: () => {
             queryClient.setQueryData(['notifications'], (oldData: NotificationWithStatus[] | undefined) =>
                 oldData?.map(n => ({ ...n, read_status: true })) ?? []
             );
        },
        onError: (error) => console.error("Failed to mark all notifications as read:", error)
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        // Correct onSuccess signature
        onSuccess: (_data, variables) => {
            const userNotificationId = variables; // Get the ID from variables
            queryClient.setQueryData(['notifications'], (oldData: NotificationWithStatus[] | undefined) =>
                oldData?.filter(n => n.user_notification_id !== userNotificationId) ?? []
            );
        },
        onError: (error) => console.error("Failed to delete notification:", error)
    });
    // --- End Corrected Mutations ---


    const unreadCount = notifications?.filter((n) => !n.read_status).length ?? 0;

    const handleOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleNotificationClick = (notification: NotificationWithStatus) => {
        if (!notification.read_status) {
            readMutation.mutate(notification.user_notification_id);
        }
        if (notification.display_link) {
            navigate(notification.display_link);
        }
        handleClose();
    };

    const handleDelete = (e: React.MouseEvent, userNotificationId: string) => {
        e.stopPropagation();
        deleteMutation.mutate(userNotificationId);
    };

    return (
        <>
            <IconButton 
              onClick={handleOpen} 
              aria-label="show notifications"
              sx={{
                color: '#212121',
                '&:hover': {
                  background: 'transparent',
                }
              }}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon sx={{ color: '#212121' }} />
                </Badge>
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                MenuListProps={{ 'aria-labelledby': 'notifications-button' }}
                PaperProps={{ 
                  style: { 
                    maxHeight: 480, 
                    width: '40ch', 
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    backgroundColor: '#FFFFFF',
                  } 
                }}
            >
                {/* Header Section */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  px: 2.5, 
                  py: 2, 
                  borderBottom: '1px solid #F0F0F0' 
                }}>
                    <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#212121' }}>
                      Notifications
                    </Typography>
                    {unreadCount > 0 && (
                        <Button 
                          size="small" 
                          onClick={() => { readAllMutation.mutate(); }} 
                          disabled={readAllMutation.isPending}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#5A3FFF',
                            fontSize: '12px',
                            '&:hover': {
                              backgroundColor: 'rgba(90, 63, 255, 0.08)',
                            }
                          }}
                        >
                            Mark all as read
                        </Button>
                    )}
                </Box>

                {/* Notification List */}
                <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                    {isLoadingNotifications ? (
                         <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                           <CircularProgress size={24} sx={{ color: '#5A3FFF' }} />
                         </Box>
                    ) : notifications && notifications.length > 0 ? (
                        notifications.map((n) => (
                            <MenuItem
                                key={n.user_notification_id}
                                onClick={() => handleNotificationClick(n)}
                                sx={{
                                    py: 1.5, 
                                    px: 2.5, 
                                    gap: 1.5, 
                                    alignItems: 'center',
                                    backgroundColor: n.read_status ? 'transparent' : 'rgba(90, 63, 255, 0.04)',
                                    borderBottom: '1px solid #F8F9FA',
                                    '&:hover': {
                                      backgroundColor: n.read_status ? '#F8F9FA' : 'rgba(90, 63, 255, 0.08)',
                                    },
                                    '&:hover .notification-delete-btn': { opacity: 1 },
                                    whiteSpace: 'normal', 
                                    wordBreak: 'break-word',
                                    '&:last-child': {
                                      borderBottom: 'none',
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 'auto', alignSelf: 'flex-start', mt: '4px' }}>
                                    <CircleNotificationsIcon 
                                      fontSize="small" 
                                      sx={{ color: n.read_status ? '#9E9E9E' : '#5A3FFF' }} 
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={n.display_message}
                                    secondary={dayjs.utc(n.timestamp).tz("Asia/Kolkata").format('MMM D, YYYY h:mm A')}
                                    primaryTypographyProps={{
                                        variant: 'body2',
                                        style: { 
                                          fontWeight: n.read_status ? 'normal' : '600',
                                          color: '#212121',
                                          fontSize: '14px',
                                        },
                                    }}
                                    secondaryTypographyProps={{ 
                                      style: { 
                                        fontSize: '12px',
                                        color: '#757575',
                                      } 
                                    }}
                                />
                                <IconButton
                                    className="notification-delete-btn"
                                    size="small" aria-label="delete notification"
                                    onClick={(e) => handleDelete(e, n.user_notification_id)}
                                    disabled={deleteMutation.isPending && deleteMutation.variables === n.user_notification_id}
                                    sx={{
                                        opacity: { xs: 1, sm: 0 },
                                        transition: 'opacity 0.2s ease-in-out',
                                        ml: 1,
                                        alignSelf: 'center',
                                        color: '#757575',
                                        '&:hover': {
                                          color: '#D32F2F',
                                          backgroundColor: 'rgba(211, 47, 47, 0.08)',
                                        }
                                    }}
                                >
                                     {(deleteMutation.isPending && deleteMutation.variables === n.user_notification_id)
                                         ? <CircularProgress size={16} sx={{ color: '#5A3FFF' }} />
                                         : <DeleteIcon fontSize="small" />
                                     }
                                </IconButton>
                            </MenuItem>
                        ))
                    ) : (
                        <Typography sx={{ 
                          px: 2.5, 
                          py: 4, 
                          textAlign: 'center', 
                          color: '#757575',
                          fontSize: '14px',
                        }}>
                            You have no notifications
                        </Typography>
                    )}
                </Box>
            </Menu>
        </>
    );
};

export default Notifications;