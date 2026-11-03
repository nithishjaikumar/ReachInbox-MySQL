import React from 'react';
import { format } from 'date-fns';
import { Clock, Send, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface EmailStatusBadgeProps {
  status: string;
  date?: Date | string;
}

export function EmailStatusBadge({ status, date }: EmailStatusBadgeProps) {
  const parsedDate = date ? new Date(date) : new Date();
  const formattedTime = format(parsedDate, 'EEE h:mm:ss a');

  switch (status) {
    case 'scheduled':
      return (
        <Badge variant="scheduled" className="gap-1.5">
          <Clock className="w-3 h-3" />
          {formattedTime}
        </Badge>
      );
    case 'sent':
      return (
        <Badge variant="sent" className="gap-1.5">
          <Send className="w-3 h-3" />
          Sent
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="processing" className="gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Sending...
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="failed" className="gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="cancelled" className="gap-1.5">
          <XCircle className="w-3 h-3" />
          Cancelled
        </Badge>
      );
    default:
      return null;
  }
}
