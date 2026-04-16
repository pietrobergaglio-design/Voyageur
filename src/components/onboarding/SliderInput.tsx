import { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

const THUMB = 28;
const TRACK_H = 6;

const clamp = (v: number) => Math.max(0, Math.min(100, v));

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function SliderInput({ value, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const computeValue = (localX: number): number => {
    const usable = trackWidthRef.current - THUMB;
    if (usable <= 0) return 50;
    return clamp(Math.round(((localX - THUMB / 2) / usable) * 100));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onChangeRef.current(computeValue(e.nativeEvent.locationX));
      },
      onPanResponderMove: (_, gs) => {
        const localX = gs.moveX - trackXRef.current;
        onChangeRef.current(computeValue(localX));
      },
    })
  ).current;

  const handleLayout = () => {
    trackRef.current?.measure((_x, _y, w, _h, pageX) => {
      trackWidthRef.current = w;
      trackXRef.current = pageX;
      setTrackWidth(w);
    });
  };

  const usableWidth = trackWidth - THUMB;
  const thumbLeft = trackWidth > 0 ? (value / 100) * usableWidth : 0;

  return (
    <View style={styles.wrapper}>
      <View
        ref={trackRef}
        style={styles.hitArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: thumbLeft }]} />
        {trackWidth > 0 && (
          <View style={[styles.thumb, { left: thumbLeft }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 20,
  },
  hitArea: {
    height: THUMB,
    justifyContent: 'center',
    overflow: 'visible',
  },
  trackBg: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  trackFill: {
    position: 'absolute',
    left: THUMB / 2,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: Colors.accent,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
