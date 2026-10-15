import { FlatList, Modal, Pressable, View } from 'react-native';
import { color, radius } from '@/theme/tokens';
import { AppText } from '../ui/AppText';
import { ListRow } from '../ui/ListRow';

/** 列挙値の選択シート（項目数が多くても使える一覧） */
export function PickerSheet({
  title,
  options,
  selectedIndex,
  visible,
  onSelect,
  onClose,
}: {
  title: string;
  options: string[];
  selectedIndex: number;
  visible: boolean;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <View className="flex-row items-center justify-between px-4" style={{ height: 56 }}>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
            <AppText variant="body" tone="accent">
              閉じる
            </AppText>
          </Pressable>
          <AppText variant="headline" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {title}
          </AppText>
          <View style={{ width: 48 }} />
        </View>
        <FlatList
          data={options}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={selectedIndex > 8 ? selectedIndex - 3 : undefined}
          getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 0.5, marginLeft: 16, backgroundColor: color.sep }} />}
          style={{ flex: 1 }}
          renderItem={({ item, index }) => (
            <View style={{ backgroundColor: color.group, borderTopLeftRadius: index === 0 ? radius.card : 0, borderTopRightRadius: index === 0 ? radius.card : 0, borderBottomLeftRadius: index === options.length - 1 ? radius.card : 0, borderBottomRightRadius: index === options.length - 1 ? radius.card : 0, overflow: 'hidden' }}>
              <ListRow
                title={item}
                checked={index === selectedIndex}
                accessibilityLabel={`選択肢 ${item}`}
                onPress={() => {
                  onSelect(index);
                  onClose();
                }}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}
