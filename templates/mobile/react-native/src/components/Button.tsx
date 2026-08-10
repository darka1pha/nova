import React from "react";
import { StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { colors } from "../theme/colors";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary";
  dark?: boolean;
}

export function Button({ title, variant = "primary", dark = true, style, ...props }: ButtonProps) {
  const currentColors = dark ? colors.dark : colors.light;
  const isPrimary = variant === "primary";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.button,
        isPrimary
          ? { backgroundColor: currentColors.primary }
          : { backgroundColor: currentColors.card, borderColor: currentColors.border, borderWidth: 1 },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          { color: isPrimary ? currentColors.primaryText : currentColors.text },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
  },
});
