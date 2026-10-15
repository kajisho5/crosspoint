import { Text, type TextProps, type TextStyle } from 'react-native';
import { color, font, type, type ColorToken } from '@/theme/tokens';

type Variant = keyof typeof type;

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: ColorToken;
  mono?: boolean;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  size?: number;
}

/** トークン経由のテキスト。色・書体を直書きしないための唯一の入口 */
export function AppText({ variant = 'subhead', tone = 'label', mono = false, weight, align, size, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: color[tone] },
        mono ? { fontFamily: font.mono, fontVariant: ['tabular-nums'] } : null,
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        size ? { fontSize: size } : null,
        style,
      ]}
    />
  );
}
