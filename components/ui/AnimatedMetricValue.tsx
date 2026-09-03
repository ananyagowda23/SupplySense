import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TextStyle, StyleProp } from 'react-native';

interface AnimatedMetricValueProps {
  value: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

export function AnimatedMetricValue({ value, style, duration = 800 }: AnimatedMetricValueProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;
  const [displayValue, setDisplayValue] = useState<string>(value);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();

    const numericMatch = value.match(/[\d.]+/);
    const targetNum = numericMatch ? parseFloat(numericMatch[0]) : null;

    if (targetNum !== null && numericMatch) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easedProgress = 1 - (1 - progress) * (1 - progress);
        const currentVal = (targetNum * easedProgress).toFixed(numericMatch[0].includes('.') ? 1 : 0);

        setDisplayValue(value.replace(numericMatch[0], currentVal));

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayValue(value);
        }
      };
      requestAnimationFrame(step);
    } else {
      setDisplayValue(value);
    }
  }, [value, duration, fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Text style={style}>{displayValue}</Text>
    </Animated.View>
  );
}
