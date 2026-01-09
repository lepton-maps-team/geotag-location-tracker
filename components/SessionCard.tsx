import { blocks, districts, states } from "@/constants/lists";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import Svg, { Circle, Path } from "react-native-svg";

interface SessionCardProps {
  item: any;
  originalIndex: number;
  onUpload: () => void;
  onSave: () => void;
  onDelete: () => void;
  onEdit: (updatedMeta: any) => void;
  isUploading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

const RouteIcon = ({
  size = 32,
  color = "#87CEEB",
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

const UploadIcon = ({
  size = 16,
  color = "#6b7280",
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

const SaveIcon = ({
  size = 16,
  color = "#6b7280",
}: {
  size?: number;
  color?: string;
}) => <MaterialIcons name="save" size={size} color={color} />;

const TrashIcon = ({
  size = 16,
  color = "#6b7280",
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

const EditIcon = ({
  size = 16,
  color = "#6b7280",
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

const SessionCard: React.FC<SessionCardProps> = ({
  item,
  onUpload,
  onSave,
  onDelete,
  onEdit,
  isUploading,
  isSaving,
  isDeleting,
}) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [searchablePicker, setSearchablePicker] = useState<{
    field: "State" | "District" | "Block" | "Ring" | null;
    searchQuery: string;
  }>({ field: null, searchQuery: "" });
  const [editMeta, setEditMeta] = useState(
    item?.meta || {
      Name: "",
      State: "",
      District: "",
      Block: "",
      Ring: "",
      ChildRing: "",
      DateTime: "",
    }
  );

  const filteredOptions = useMemo(() => {
    if (!searchablePicker.field) return [];
    const query = searchablePicker.searchQuery.toLowerCase().trim();
    let options: string[] = [];

    if (searchablePicker.field === "State") {
      options = states;
    } else if (searchablePicker.field === "District") {
      options = districts;
    } else if (searchablePicker.field === "Block") {
      options = blocks;
    } else if (searchablePicker.field === "Ring") {
      options = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10"];
    }

    if (!query) return options;
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [searchablePicker.field, searchablePicker.searchQuery]);

  const handleSaveEdit = () => {
    onEdit(editMeta);
    setShowEditDialog(false);
  };

  const sessionName = item?.meta?.Name ?? "Unnamed";

  // Format DateTime for display
  const formatDateTime = (dateTimeString?: string) => {
    if (!dateTimeString) return "";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeString;
    }
  };

  return (
    <View style={styles.recordItem}>
      <View style={styles.recordItemContent}>
        {/* Icon on the left */}
        <View style={styles.recordItemIcon}>
          <RouteIcon size={32} color="#87CEEB" />
        </View>

        {/* Content area (name, buttons) */}
        <View style={styles.recordItemMain}>
          {/* Top row: Session name and DateTime */}
          <View style={styles.recordItemHeader}>
            <Text style={styles.recordTitle}>{sessionName}</Text>
            {item?.meta?.DateTime && (
              <Text style={styles.recordDateTime}>
                {formatDateTime(item.meta.DateTime)}
              </Text>
            )}
          </View>

          {/* Buttons row */}
          <View style={styles.recordActions}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonIcon,
                styles.editButton,
              ]}
              onPress={() => {
                setEditMeta(
                  item?.meta || {
                    Name: "",
                    State: "",
                    District: "",
                    Block: "",
                    Ring: "",
                    ChildRing: "",
                    DateTime: "",
                  }
                );
                setShowEditDialog(true);
              }}
            >
              <EditIcon size={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonIcon,
                styles.uploadButton,
              ]}
              onPress={onUpload}
              disabled={isUploading || item?.uploaded}
            >
              {isUploading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : item?.uploaded ? (
                <MaterialIcons name="check-circle" size={16} color="#ffffff" />
              ) : (
                <UploadIcon size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonIcon,
                styles.saveButton,
              ]}
              onPress={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <SaveIcon size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonIcon,
                styles.deleteButton,
              ]}
              onPress={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <TrashIcon size={16} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Edit Dialog Modal */}
      <Modal visible={showEditDialog} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <ScrollView
                style={{ flexGrow: 0 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Edit Session Details</Text>
                <Text style={styles.modalSubtitle}>
                  Update metadata for this session.
                </Text>

                {/* Session Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Session name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Field Survey"
                    placeholderTextColor="#94a3b8"
                    value={editMeta.Name}
                    onChangeText={(t) => setEditMeta({ ...editMeta, Name: t })}
                  />
                </View>

                {/* STATE */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "State", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {editMeta.State || "Select state"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* DISTRICT */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>District *</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({
                        field: "District",
                        searchQuery: "",
                      })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {editMeta.District || "Select district"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* BLOCK */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Block</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "Block", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {editMeta.Block || "Select block"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* RING */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Ring</Text>
                  <TouchableOpacity
                    style={styles.pickerWrapper}
                    onPress={() =>
                      setSearchablePicker({ field: "Ring", searchQuery: "" })
                    }
                  >
                    <Text style={styles.pickerText}>
                      {editMeta.Ring || "Select ring"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CHILD RING */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Child ring</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    placeholderTextColor="#94a3b8"
                    value={editMeta.ChildRing}
                    onChangeText={(t) =>
                      setEditMeta({ ...editMeta, ChildRing: t })
                    }
                  />
                </View>
              </ScrollView>

              {/* BUTTONS */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonGhost]}
                  onPress={() => setShowEditDialog(false)}
                >
                  <Text style={styles.modalButtonGhostText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Searchable Picker Modal */}
      <Modal
        visible={searchablePicker.field !== null}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSearchablePicker({ field: null, searchQuery: "" })
        }
      >
        <View style={styles.searchableModalOverlay}>
          <View style={styles.searchableModalBox}>
            <Text style={styles.searchableModalTitle}>
              Select {searchablePicker.field}
            </Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#94a3b8"
              value={searchablePicker.searchQuery}
              onChangeText={(text) =>
                setSearchablePicker({
                  ...searchablePicker,
                  searchQuery: text,
                })
              }
              autoFocus
            />
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              style={styles.searchableList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchableItem}
                  onPress={() => {
                    if (searchablePicker.field === "State") {
                      setEditMeta({ ...editMeta, State: item });
                    } else if (searchablePicker.field === "District") {
                      setEditMeta({ ...editMeta, District: item });
                    } else if (searchablePicker.field === "Block") {
                      setEditMeta({ ...editMeta, Block: item });
                    } else if (searchablePicker.field === "Ring") {
                      setEditMeta({ ...editMeta, Ring: item });
                    }
                    setSearchablePicker({ field: null, searchQuery: "" });
                  }}
                >
                  <Text style={styles.searchableItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.searchableEmpty}>
                  <Text style={styles.searchableEmptyText}>
                    No results found
                  </Text>
                </View>
              }
            />
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalButtonGhost,
                { flex: 0, width: "100%" },
              ]}
              onPress={() =>
                setSearchablePicker({ field: null, searchQuery: "" })
              }
            >
              <Text style={styles.modalButtonGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  recordItem: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#1f1f1f",
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
    backgroundColor: "#1f1f1f",
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
  recordDateTime: {
    fontSize: 12,
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
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#161616",
  },
  uploadButton: {
    backgroundColor: "#161616",
  },
  saveButton: {
    backgroundColor: "#161616",
  },
  deleteButton: {
    backgroundColor: "#161616",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: "#222222",
    maxHeight: "80%",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
  },
  fieldGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: "#cbd5f5",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "white",
    backgroundColor: "#141414",
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#141414",
    justifyContent: "center",
  },
  pickerText: {
    color: "white",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "black",
    fontSize: 15,
    fontWeight: "600",
  },
  modalButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  modalButtonGhostText: {
    color: "#cbd5f5",
    fontSize: 15,
    fontWeight: "600",
  },
  searchableModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  searchableModalBox: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  searchableModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#f8fafc",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
  },
  searchableList: {
    maxHeight: 300,
  },
  searchableItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  searchableItemText: {
    color: "#f8fafc",
    fontSize: 16,
  },
  searchableEmpty: {
    paddingVertical: 40,
    alignItems: "center",
  },
  searchableEmptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});

export default SessionCard;
