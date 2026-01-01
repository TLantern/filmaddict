"use client"
import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VideoStatus } from "@/lib/types";
import { getProjects, getVideoStatus } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  video_id: string;
  type: "queued" | "completed" | "failed";
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDashboard = ({ isOpen, onClose }: NotificationDashboardProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const projectsData = await getProjects();
      const allNotifications: Notification[] = [];

      for (const project of projectsData.projects) {
        try {
          const statusData = await getVideoStatus(project.video_id);
          
          if (statusData.status === VideoStatus.QUEUED) {
            allNotifications.push({
              id: `queued-${project.video_id}`,
              video_id: project.video_id,
              type: "queued",
              message: `Video processing has been queued`,
              timestamp: new Date(statusData.created_at),
              read: false,
            });
          } else if (statusData.status === VideoStatus.DONE) {
            allNotifications.push({
              id: `completed-${project.video_id}`,
              video_id: project.video_id,
              type: "completed",
              message: `Video processing completed successfully`,
              timestamp: new Date(statusData.created_at),
              read: false,
            });
          } else if (statusData.status === VideoStatus.FAILED) {
            allNotifications.push({
              id: `failed-${project.video_id}`,
              video_id: project.video_id,
              type: "failed",
              message: `Video processing failed`,
              timestamp: new Date(statusData.created_at),
              read: false,
            });
          }
        } catch (err) {
          console.error(`Failed to get status for video ${project.video_id}:`, err);
        }
      }

      const sortedNotifications = allNotifications.sort((a, b) => {
        const typeOrder = { queued: 0, completed: 1, failed: 2 };
        const typeDiff = typeOrder[a.type] - typeOrder[b.type];
        if (typeDiff !== 0) return typeDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
      
      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    router.push(`/timeline/${notification.video_id}`);
    onClose();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "queued":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
        <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#e3b54a] dark:bg-[#FFD873] text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                        !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                            {notification.video_id}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

