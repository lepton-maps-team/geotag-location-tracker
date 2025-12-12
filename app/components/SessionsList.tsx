import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import SessionListItem from "./SessionListItem";

interface SessionsListProps {
  locations: any[];
  searchQuery: string;
  uploadingIndex: number | null;
  deletingIndex: number | null;
  onEdit: (item: any, index: number) => void;
  onUpload: (item: any, index: number) => void;
  onDelete: (index: number) => void;
}

const SessionsList: React.FC<SessionsListProps> = ({
  locations,
  searchQuery,
  uploadingIndex,
  deletingIndex,
  onEdit,
  onUpload,
  onDelete,
}) => {
  const filteredLocations = locations.filter((item) => {
    if (!searchQuery.trim()) return true;
    const name = item?.meta?.videoName?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase().trim());
  });

  return (
    <FlatList
      data={filteredLocations}
      keyExtractor={(item, index) =>
        item?.meta?.id?.toString() ??
        `${item?.meta?.videoName ?? "record"}-${index}`
      }
      style={styles.list}
      contentContainerStyle={[
        styles.listContainer,
        !locations.length && styles.listContainerEmpty,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No recordings yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Record New Session" to start capturing GPS points with rich
            metadata.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <SessionListItem
          item={item}
          index={index}
          uploadingIndex={uploadingIndex}
          deletingIndex={deletingIndex}
          onEdit={onEdit}
          onUpload={onUpload}
          onDelete={onDelete}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
    marginHorizontal: 16,
  },
  listContainer: {
    gap: 16,
    paddingVertical: 4,
  },
  listContainerEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e2e8f0",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default SessionsList;
