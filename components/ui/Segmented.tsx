import SegmentedControl from '@react-native-segmented-control/segmented-control';
import type { ViewStyle } from 'react-native';

/** システムの UISegmentedControl（HIG：Segmented controls） */
export function Segmented({
  values,
  index,
  onChange,
  enabled = true,
  style,
  accessibilityLabel,
}: {
  values: string[];
  index: number;
  onChange: (index: number) => void;
  enabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  return (
    <SegmentedControl
      values={values}
      selectedIndex={index}
      enabled={enabled}
      onChange={(e) => onChange(e.nativeEvent.selectedSegmentIndex)}
      style={style}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
