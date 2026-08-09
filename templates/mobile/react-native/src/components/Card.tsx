import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors } from "../theme/colors";

interface CardProps extends ViewProps {
  dark?: boolean;
}

export function Card({ children, style, dark = true, ...props }: CardProps) {
  const currentColors = dark ? colors.dark : colors.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentColors.card,
          borderColor: currentColors.cardBorder,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
