import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hasSessions: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  hasSessions,
}) => {
  return (
    <View style={styles.searchContainer}>
      <MaterialIcons
        name="search"
        size={20}
        color={hasSessions ? "#94a3b8" : "#6b7280"}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.searchInput, !hasSessions && styles.searchInputDisabled]}
        placeholder="Search"
        placeholderTextColor={hasSessions ? "#94a3b8" : "#6b7280"}
        value={searchQuery}
        onChangeText={onSearchChange}
        editable={hasSessions}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => onSearchChange("")}
          style={styles.clearButton}
        >
          <MaterialIcons name="close" size={20} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 12,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#e2e8f0",
    padding: 0,
  },
  searchInputDisabled: {
    color: "#6b7280",
    opacity: 0.6,
  },
  clearButton: {
    padding: 4,
  },
});

export default SearchBar;
