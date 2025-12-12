import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";

interface UploadProgressDialogProps {
  visible: boolean;
  uploadStatus: string;
}

const UploadProgressDialog: React.FC<UploadProgressDialogProps> = ({
  visible,
  uploadStatus,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing during upload
    >
      <View style={styles.uploadDialogOverlay}>
        <View style={styles.uploadDialogBox}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.uploadDialogTitle}>Uploading Session</Text>
          <Text style={styles.uploadDialogStatus}>{uploadStatus}</Text>
          <Text style={styles.uploadDialogHint}>
            Please don't close this screen
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  uploadDialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  uploadDialogBox: {
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  uploadDialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e2e8f0",
    marginTop: 20,
    marginBottom: 12,
  },
  uploadDialogStatus: {
    fontSize: 15,
    color: "#38bdf8",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  uploadDialogHint: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
});

export default UploadProgressDialog;
