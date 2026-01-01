"use client"
import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertCircle, Check, Bell } from "lucide-react";
import { VideoStatus } from "@/lib/types";
import { getProjects, getVideoStatus } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Notification {
  id: string;
  video_id: string;
  type: "queued" | "completed" | "failed";
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationDropdownProps {
  notificationCount: number;
  onNotificationClick?: () => void;
}

export const NotificationDropdown = ({ notificationCount, onNotificationClick }: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
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
    setIsOpen(false);
    onNotificationClick?.();
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "queued":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
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

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-lg transition-all duration-200 ease-out"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "cursor-pointer p-3 transition-all duration-150 ease-out focus:bg-gray-50 dark:focus:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800",
                  !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                )}
              >
                <div className="flex items-start gap-3 w-full">
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
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

