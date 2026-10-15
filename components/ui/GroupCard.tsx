import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { AppText } from './AppText';

/** iOS の inset grouped リスト相当（見出し・カード・区切り線・脚注） */
export function GroupCard({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View className="mb-4">
      {title ? (
        <AppText variant="footnote" tone="label2" weight="500" className="mb-1.5 px-4" style={{ letterSpacing: 0.4 }}>
          {title}
        </AppText>
      ) : null}
      <View style={{ backgroundColor: color.group, borderRadius: radius.card, overflow: 'hidden' }}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={{ height: 0.5, marginLeft: 16, backgroundColor: color.sep }} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <AppText variant="footnote" tone="label2" className="mt-1.5 px-4">
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}
