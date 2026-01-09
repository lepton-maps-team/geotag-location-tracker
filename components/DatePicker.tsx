import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DatePickerProps {
  visible: boolean;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({
  visible,
  selectedDate,
  onDateSelect,
  onClose,
}) => {
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarMonth);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
      );
    }

    return days;
  }, [calendarMonth]);

  // Helper function to format date as YYYY-MM-DD using local timezone
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCalendarMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isSelectedDate = (date: Date | null) => {
    if (!date || !selectedDate) return false;
    const dateStr = formatDateLocal(date);
    return dateStr === selectedDate;
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateLocal(date);
    onDateSelect(dateStr);
    onClose();
  };

  const handleClear = () => {
    onDateSelect("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Select Date</Text>
          <Text style={styles.modalSubtitle}>
            Choose a date to filter surveys
          </Text>

          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => navigateMonth("prev")}
              style={styles.calendarNavButton}
            >
              <MaterialIcons name="chevron-left" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.calendarMonthText}>
              {calendarMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => navigateMonth("next")}
              style={styles.calendarNavButton}
            >
              <MaterialIcons name="chevron-right" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Calendar Week Days */}
          <View style={styles.calendarWeekDays}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <View key={day} style={styles.calendarWeekDay}>
                <Text style={styles.calendarWeekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((date, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !date && styles.calendarDayEmpty,
                  date && isSelectedDate(date) && styles.calendarDaySelected,
                  date && isToday(date) && styles.calendarDayToday,
                ]}
                onPress={() => date && handleDateClick(date)}
                disabled={!date}
              >
                {date && (
                  <Text
                    style={[
                      styles.calendarDayText,
                      isSelectedDate(date) && styles.calendarDayTextSelected,
                      isToday(date) &&
                        !isSelectedDate(date) &&
                        styles.calendarDayTextToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonGhost]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonGhostText}>Cancel</Text>
            </TouchableOpacity>
            {selectedDate && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonGhost]}
                onPress={handleClear}
              >
                <Text style={styles.modalButtonGhostText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: "#222222",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.25)",
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
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  calendarWeekDays: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  calendarWeekDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    margin: 2,
  },
  calendarDayEmpty: {
    opacity: 0,
  },
  calendarDaySelected: {
    backgroundColor: "rgba(99, 102, 241, 0.9)",
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: "rgba(99, 102, 241, 0.5)",
  },
  calendarDayText: {
    fontSize: 14,
    color: "#e2e8f0",
    fontWeight: "500",
  },
  calendarDayTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  calendarDayTextToday: {
    color: "rgba(99, 102, 241, 0.9)",
    fontWeight: "700",
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
});

export default DatePicker;
