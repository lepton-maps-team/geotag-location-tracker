import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface SessionListItemProps {
  item: any;
  index: number;
  uploadingIndex: number | null;
  deletingIndex: number | null;
  onEdit: (item: any, index: number) => void;
  onUpload: (item: any, index: number) => void;
  onDelete: (index: number) => void;
}

const RouteIcon = ({
  size = 24,
  color = "#3b82f6",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="6"
      cy="19"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="18"
      cy="5"
      r="3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PencilIcon = ({
  size = 24,
  color = "#94a3b8",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="m15 5 4 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlayIcon = ({
  size = 24,
  color = "#3b82f6",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = ({
  size = 24,
  color = "#FF4C4C",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 11v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 11v6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 6h18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UploadIcon = ({
  size = 24,
  color = "#4DA3FF",
}: {
  size?: number;
  color?: string;
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3v12"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="m17 8-5-5-5 5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SessionListItem: React.FC<SessionListItemProps> = ({
  item,
  index,
  uploadingIndex,
  deletingIndex,
  onEdit,
  onUpload,
  onDelete,
}) => {
  const router = useRouter();

  return (
    <View style={styles.recordItem}>
      <View style={styles.recordItemContent}>
        {/* Icon on the left */}
        <View style={styles.recordItemIcon}>
          <RouteIcon size={32} color="#87CEEB" />
        </View>

        {/* Content area (name, date, buttons) */}
        <View style={styles.recordItemMain}>
          {/* Top row: Session name and date */}
          <View style={styles.recordItemHeader}>
            <Text style={styles.recordTitle}>
              {item?.meta?.videoName ?? "Unnamed"}
            </Text>
            {item?.meta?.recordedAt && (
              <Text style={styles.recordDate}>
                {new Date(item.meta.recordedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>

          {/* Buttons row */}
          <View style={styles.recordActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonIcon]}
              onPress={() => onEdit(item, index)}
            >
              <PencilIcon size={16} color="#6b7280" />
            </TouchableOpacity>
            {item?.videoUri && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonIcon]}
                onPress={() => {
                  router.push({
                    pathname: "/video" as any,
                    params: {
                      videoUri: item.videoUri,
                      sessionName: item?.meta?.videoName ?? "Unnamed",
                    },
                  });
                }}
              >
                <PlayIcon size={16} color="#6b7280" />
              </TouchableOpacity>
            )}
            {item?.uploaded ? (
              <View style={[styles.actionButton, styles.actionButtonIcon]}>
                <MaterialIcons name="check-circle" size={16} color="#2ECC71" />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonIcon]}
                onPress={() => onUpload(item, index)}
                disabled={uploadingIndex === index}
              >
                {uploadingIndex === index ? (
                  <ActivityIndicator color="#6b7280" size="small" />
                ) : (
                  <UploadIcon size={16} color="#6b7280" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonIcon]}
              onPress={() => onDelete(index)}
              disabled={deletingIndex === index}
            >
              {deletingIndex === index ? (
                <ActivityIndicator color="#6b7280" size="small" />
              ) : (
                <TrashIcon size={16} color="#6b7280" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recordItem: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#111111",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  recordItemContent: {
    flexDirection: "row",
    gap: 12,
  },
  recordItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordItemMain: {
    flex: 1,
    gap: 8,
  },
  recordItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
  },
  recordDate: {
    fontSize: 13,
    color: "#94a3b8",
    marginLeft: 8,
  },
  recordActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonIcon: {
    flex: 0,
    width: 40,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "#1e1e1e",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SessionListItem;
