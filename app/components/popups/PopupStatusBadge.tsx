import { Badge } from "@shopify/polaris";
import type { PopupStatus } from "../../types/popup";

interface PopupStatusBadgeProps {
  status: PopupStatus;
  size?: 'small' | 'medium';
}

export function PopupStatusBadge({ status, size = 'medium' }: PopupStatusBadgeProps) {
  const tone = status === 'ACTIVE' ? 'success' : 
               status === 'DRAFT' ? 'attention' : 
               status === 'PAUSED' ? 'subdued' : 'critical';

  return (
    <Badge tone={tone} size={size}>
      {status.toLowerCase()}
    </Badge>
  );
}