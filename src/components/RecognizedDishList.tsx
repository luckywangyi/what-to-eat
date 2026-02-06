import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {
  Text,
  Checkbox,
  IconButton,
  TextInput,
  Chip,
  Button,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import {
  ParsedDish,
  DishCategory,
  DISH_CATEGORY_LABELS,
} from '../types';
import {colors, typography, spacing, radius} from '../theme';

interface RecognizedDishListProps {
  dishes: ParsedDish[];
  onDishesChange: (dishes: ParsedDish[]) => void;
  onConfirm: (selectedDishes: ParsedDish[]) => void;
  onCancel: () => void;
}

export const RecognizedDishList: React.FC<RecognizedDishListProps> = ({
  dishes,
  onDishesChange,
  onConfirm,
  onCancel,
}) => {
  const [editingDish, setEditingDish] = useState<ParsedDish | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState<DishCategory>('meat');

  const selectedCount = dishes.filter(d => d.selected).length;
  const allSelected = dishes.length > 0 && selectedCount === dishes.length;

  // 切换选中状态
  const toggleSelect = (id: string) => {
    const updated = dishes.map(d =>
      d.id === id ? {...d, selected: !d.selected} : d
    );
    onDishesChange(updated);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const newSelected = !allSelected;
    const updated = dishes.map(d => ({...d, selected: newSelected}));
    onDishesChange(updated);
  };

  // 删除菜品
  const deleteDish = (id: string) => {
    const updated = dishes.filter(d => d.id !== id);
    onDishesChange(updated);
  };

  // 打开编辑弹窗
  const openEdit = (dish: ParsedDish) => {
    setEditingDish(dish);
    setEditName(dish.name);
    setEditPrice(dish.price.toString());
    setEditCategory(dish.category);
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingDish) return;
    
    const updated = dishes.map(d =>
      d.id === editingDish.id
        ? {
            ...d,
            name: editName.trim() || d.name,
            price: parseFloat(editPrice) || d.price,
            category: editCategory,
          }
        : d
    );
    onDishesChange(updated);
    setEditingDish(null);
  };

  // 确认导入
  const handleConfirm = () => {
    const selectedDishes = dishes.filter(d => d.selected);
    onConfirm(selectedDishes);
  };

  return (
    <View style={styles.container}>
      {/* 头部信息 */}
      <View style={styles.header}>
        <Text style={styles.title}>识别结果</Text>
        <Text style={styles.subtitle}>
          共 {dishes.length} 项，已选 {selectedCount} 项
        </Text>
      </View>

      {/* 全选按钮 */}
      <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAll}>
        <Checkbox status={allSelected ? 'checked' : selectedCount > 0 ? 'indeterminate' : 'unchecked'} />
        <Text style={styles.selectAllText}>
          {allSelected ? '取消全选' : '全选'}
        </Text>
      </TouchableOpacity>

      <Divider />

      {/* 菜品列表 */}
      <ScrollView style={styles.list}>
        {dishes.map((dish) => (
          <View key={dish.id} style={styles.dishRow}>
            <TouchableOpacity
              style={styles.checkboxArea}
              onPress={() => toggleSelect(dish.id)}
            >
              <Checkbox status={dish.selected ? 'checked' : 'unchecked'} />
            </TouchableOpacity>
            
            <View style={styles.dishInfo}>
              <Text style={styles.dishName}>{dish.name}</Text>
              <View style={styles.dishMeta}>
                <Text style={styles.dishPrice}>¥{dish.price.toFixed(1)}</Text>
                <Chip compact style={styles.categoryChip}>
                  {DISH_CATEGORY_LABELS[dish.category]}
                </Chip>
              </View>
            </View>
            
            <View style={styles.actions}>
              <IconButton
                icon="pencil"
                size={18}
                onPress={() => openEdit(dish)}
              />
              <IconButton
                icon="delete"
                size={18}
                iconColor="#e53935"
                onPress={() => deleteDish(dish.id)}
              />
            </View>
          </View>
        ))}
        
        {dishes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>没有识别到菜品</Text>
          </View>
        )}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <Button mode="outlined" onPress={onCancel} style={styles.footerButton}>
          取消
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          disabled={selectedCount === 0}
          style={styles.footerButton}
        >
          确认导入 ({selectedCount})
        </Button>
      </View>

      {/* 编辑弹窗 */}
      <Portal>
        <Modal
          visible={editingDish !== null}
          onDismiss={() => setEditingDish(null)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>编辑菜品</Text>
          
          <TextInput
            label="菜品名称"
            value={editName}
            onChangeText={setEditName}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="价格"
            value={editPrice}
            onChangeText={setEditPrice}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="¥" />}
            style={styles.input}
          />
          
          <Text style={styles.label}>分类</Text>
          <View style={styles.categoryContainer}>
            {(Object.keys(DISH_CATEGORY_LABELS) as DishCategory[]).map(cat => (
              <Chip
                key={cat}
                selected={editCategory === cat}
                onPress={() => setEditCategory(cat)}
                style={styles.chip}
              >
                {DISH_CATEGORY_LABELS[cat]}
              </Chip>
            ))}
          </View>
          
          <View style={styles.modalActions}>
            <Button onPress={() => setEditingDish(null)}>取消</Button>
            <Button mode="contained" onPress={saveEdit}>保存</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.title3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
  },
  selectAllText: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
  list: {
    flex: 1,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
  },
  checkboxArea: {
    padding: spacing.sm,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  dishMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  dishPrice: {
    ...typography.subhead,
    color: colors.accent,
    fontWeight: '600',
  },
  categoryChip: {
    height: 24,
    backgroundColor: colors.surfaceSecondary,
  },
  actions: {
    flexDirection: 'row',
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  footerButton: {
    flex: 1,
    borderRadius: radius.md,
  },
  modal: {
    backgroundColor: colors.surface,
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

export default RecognizedDishList;
