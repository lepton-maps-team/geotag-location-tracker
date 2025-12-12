import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface MetadataDialogProps {
  visible: boolean;
  selectedItem: any;
  selectedIndex: number | null;
  editedMeta: any;
  savingVideoIndex: number | null;
  savingTrackIndex: number | null;
  onCancel: () => void;
  onSave: () => void;
  onSaveVideo: () => void;
  onSaveTrack: () => void;
  onMetaChange: (key: string, value: string) => void;
}

const MetadataDialog: React.FC<MetadataDialogProps> = ({
  visible,
  selectedItem,
  selectedIndex,
  editedMeta,
  savingVideoIndex,
  savingTrackIndex,
  onCancel,
  onSave,
  onSaveVideo,
  onSaveTrack,
  onMetaChange,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.metadataDialogOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.metadataDialogBox}>
            <ScrollView
              style={styles.metadataScrollView}
              contentContainerStyle={styles.metadataScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.metadataDialogTitle}>Session Details</Text>
              <Text style={styles.metadataDialogSubtitle}>
                Edit session metadata
              </Text>

              {selectedItem?.meta?.recordedAt && (
                <View style={styles.metadataDateContainer}>
                  <MaterialIcons
                    name="calendar-today"
                    size={16}
                    color="#94a3b8"
                  />
                  <Text style={styles.metadataDateText}>
                    {new Date(selectedItem.meta.recordedAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </View>
              )}

              {Object.entries(editedMeta || {})
                .filter(
                  ([key]) =>
                    key !== "videoPath" &&
                    key !== "childRing" &&
                    key !== "recordedAt"
                )
                .map(([key, value]) => (
                  <View key={key} style={styles.metadataField}>
                    <Text style={styles.metadataFieldLabel}>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())}
                    </Text>
                    <TextInput
                      style={styles.metadataInput}
                      value={String(value || "")}
                      onChangeText={(text) => onMetaChange(key, text)}
                      placeholder={`Enter ${key}`}
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                ))}

              {/* Save Video and Save Track Buttons */}
              <View style={styles.metadataSaveActions}>
                <TouchableOpacity
                  style={[
                    styles.metadataSaveButton,
                    (!selectedItem?.videoUri ||
                      savingVideoIndex === selectedIndex) &&
                      styles.metadataSaveButtonDisabled,
                  ]}
                  onPress={onSaveVideo}
                  disabled={
                    !selectedItem?.videoUri ||
                    savingVideoIndex === selectedIndex
                  }
                >
                  {savingVideoIndex === selectedIndex ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="videocam" size={20} color="#fff" />
                  )}
                  <Text style={styles.metadataSaveButtonText}>Save Video</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.metadataSaveButton,
                    savingTrackIndex === selectedIndex &&
                      styles.metadataSaveButtonDisabled,
                  ]}
                  onPress={onSaveTrack}
                  disabled={savingTrackIndex === selectedIndex}
                >
                  {savingTrackIndex === selectedIndex ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialIcons name="route" size={20} color="#fff" />
                  )}
                  <Text style={styles.metadataSaveButtonText}>Save Track</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.metadataDialogButtons}>
                <TouchableOpacity
                  style={[
                    styles.metadataDialogButton,
                    styles.metadataDialogButtonCancel,
                  ]}
                  onPress={onCancel}
                >
                  <Text style={styles.metadataDialogButtonCancelText}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.metadataDialogButton,
                    styles.metadataDialogButtonSave,
                  ]}
                  onPress={onSave}
                >
                  <Text style={styles.metadataDialogButtonSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  metadataDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  keyboardAvoidingView: {
    width: "100%",
    maxHeight: "90%",
  },
  metadataDialogBox: {
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    overflow: "hidden",
  },
  metadataScrollView: {
    flexGrow: 0,
  },
  metadataScrollContent: {
    padding: 24,
    gap: 16,
  },
  metadataDialogTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  metadataDialogSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  metadataDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingVertical: 8,
  },
  metadataDateText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  metadataField: {
    gap: 8,
  },
  metadataFieldLabel: {
    fontSize: 13,
    color: "#cbd5f5",
    fontWeight: "500",
  },
  metadataInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#e2e8f0",
    backgroundColor: "rgba(31, 41, 55, 0.5)",
  },
  metadataDialogButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metadataDialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  metadataDialogButtonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  metadataDialogButtonSave: {
    backgroundColor: "white",
  },
  metadataDialogButtonCancelText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
  },
  metadataDialogButtonSaveText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  metadataSaveActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  metadataSaveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  metadataSaveButtonDisabled: {
    opacity: 0.5,
  },
  metadataSaveButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default MetadataDialog;
