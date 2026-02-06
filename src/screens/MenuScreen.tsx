import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, ScrollView, StyleSheet, Alert} from 'react-native';
import {
  Text,
  FAB,
  Portal,
  TextInput,
  SegmentedButtons,
  Chip,
  Divider,
  List,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import {useFocusEffect} from '@react-navigation/native';
import {DishItem} from '../components/DishItem';
import {PhotoImportModal} from '../components/PhotoImportModal';
import {AnimatedModal} from '../components/AnimatedModal';
import {PressableScale} from '../components/PressableScale';
import {useMenuStore} from '../stores/menuStore';
import {useApiConfigStore} from '../stores/apiConfigStore';
import {
  Dish,
  Canteen,
  DishCategory,
  NutritionTag,
  ParsedDish,
  DISH_CATEGORY_LABELS,
  NUTRITION_TAG_LABELS,
} from '../types';
import {typography, spacing, radius, ThemeColors} from '../theme';
import {useAppTheme} from '../context/ThemeContext';

type ModalMode = 'none' | 'addCanteen' | 'editCanteen' | 'addDish' | 'editDish';

export const MenuScreen: React.FC = () => {
  const {colors} = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [photoImportVisible, setPhotoImportVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 表单状态
  const [canteenName, setCanteenName] = useState('');
  const [canteenLocation, setCanteenLocation] = useState('');
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishCategory, setDishCategory] = useState<DishCategory>('meat');
  const [dishTags, setDishTags] = useState<NutritionTag[]>([]);
  const [dishWindow, setDishWindow] = useState('');

  const {
    canteens,
    dishes,
    loadCanteens,
    loadDishes,
    addCanteen,
    updateCanteen,
    deleteCanteen,
    addDish,
    updateDish,
    deleteDish,
    toggleDishAvailability,
  } = useMenuStore();

  const {config, loadConfig, isConfigured} = useApiConfigStore();

  useFocusEffect(
    useCallback(() => {
      loadCanteens();
      loadDishes();
      loadConfig();
    }, [])
  );

  // 显示消息
  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // 打开拍照导入
  const openPhotoImport = () => {
    if (!isConfigured) {
      showMessage('请先在设置中配置 API Key');
      return;
    }
    if (canteens.length === 0) {
      showMessage('请先添加食堂');
      return;
    }
    setPhotoImportVisible(true);
  };

  // 处理拍照导入
  const handlePhotoImport = async (parsedDishes: ParsedDish[]) => {
    // 选择第一个食堂作为导入目标
    const targetCanteen = canteens[0];
    if (!targetCanteen) {
      throw new Error('没有可用的食堂');
    }

    // 批量添加菜品
    for (const parsed of parsedDishes) {
      await addDish({
        name: parsed.name,
        price: parsed.price,
        category: parsed.category,
        nutritionTags: [],
        canteenId: targetCanteen.id,
      });
    }
  };

  // 打开添加食堂弹窗
  const openAddCanteenModal = () => {
    setCanteenName('');
    setCanteenLocation('');
    setModalMode('addCanteen');
  };

  // 打开编辑食堂弹窗
  const openEditCanteenModal = (canteen: Canteen) => {
    setSelectedCanteen(canteen);
    setCanteenName(canteen.name);
    setCanteenLocation(canteen.location || '');
    setModalMode('editCanteen');
  };

  // 打开添加菜品弹窗
  const openAddDishModal = (canteen: Canteen) => {
    setSelectedCanteen(canteen);
    setDishName('');
    setDishPrice('');
    setDishCategory('meat');
    setDishTags([]);
    setDishWindow('');
    setModalMode('addDish');
  };

  // 打开编辑菜品弹窗
  const openEditDishModal = (dish: Dish) => {
    const canteen = canteens.find(c => c.id === dish.canteenId);
    setSelectedCanteen(canteen || null);
    setEditingDish(dish);
    setDishName(dish.name);
    setDishPrice(dish.price.toString());
    setDishCategory(dish.category);
    setDishTags([...dish.nutritionTags]);
    setDishWindow(dish.windowName || '');
    setModalMode('editDish');
  };

  // 保存食堂
  const handleSaveCanteen = async () => {
    if (!canteenName.trim()) {
      Alert.alert('提示', '请输入食堂名称');
      return;
    }

    if (modalMode === 'addCanteen') {
      await addCanteen(canteenName.trim(), canteenLocation.trim() || undefined);
    } else if (modalMode === 'editCanteen' && selectedCanteen) {
      await updateCanteen({
        ...selectedCanteen,
        name: canteenName.trim(),
        location: canteenLocation.trim() || undefined,
      });
    }
    setModalMode('none');
  };

  // 删除食堂
  const handleDeleteCanteen = (canteen: Canteen) => {
    const canteenDishes = dishes.filter(d => d.canteenId === canteen.id);
    Alert.alert(
      '确认删除',
      `确定要删除"${canteen.name}"吗？\n这将同时删除该食堂下的 ${canteenDishes.length} 个菜品。`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteCanteen(canteen.id),
        },
      ]
    );
  };

  // 保存菜品
  const handleSaveDish = async () => {
    if (!dishName.trim()) {
      Alert.alert('提示', '请输入菜品名称');
      return;
    }
    if (!dishPrice || isNaN(parseFloat(dishPrice))) {
      Alert.alert('提示', '请输入有效的价格');
      return;
    }
    if (!selectedCanteen) {
      Alert.alert('提示', '请选择食堂');
      return;
    }

    const dishData = {
      name: dishName.trim(),
      price: parseFloat(dishPrice),
      category: dishCategory,
      nutritionTags: dishTags,
      canteenId: selectedCanteen.id,
      windowName: dishWindow.trim() || undefined,
    };

    if (modalMode === 'addDish') {
      await addDish(dishData);
    } else if (modalMode === 'editDish' && editingDish) {
      await updateDish({
        ...editingDish,
        ...dishData,
      });
    }
    setModalMode('none');
  };

  // 删除菜品
  const handleDeleteDish = (dish: Dish) => {
    Alert.alert(
      '确认删除',
      `确定要删除"${dish.name}"吗？`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '删除',
          style: 'destructive',
          onPress: () => deleteDish(dish.id),
        },
      ]
    );
  };

  // 切换营养标签
  const toggleTag = (tag: NutritionTag) => {
    if (dishTags.includes(tag)) {
      setDishTags(dishTags.filter(t => t !== tag));
    } else {
      setDishTags([...dishTags, tag]);
    }
  };

  // 食堂展开状态
  const [expandedCanteens, setExpandedCanteens] = useState<Set<number>>(new Set());

  // 切换食堂展开状态
  const toggleCanteenExpanded = (canteenId: number) => {
    setExpandedCanteens(prev => {
      const next = new Set(prev);
      if (next.has(canteenId)) {
        next.delete(canteenId);
      } else {
        next.add(canteenId);
      }
      return next;
    });
  };

  // 搜索过滤后的菜品
  const filteredDishes = useMemo(() => {
    if (!searchQuery.trim()) return dishes;
    const q = searchQuery.trim().toLowerCase();
    return dishes.filter(d => 
      d.name.toLowerCase().includes(q) || 
      DISH_CATEGORY_LABELS[d.category]?.includes(q)
    );
  }, [dishes, searchQuery]);

  // 搜索时需要显示的食堂（有匹配菜品的食堂）
  const visibleCanteens = useMemo(() => {
    if (!searchQuery.trim()) return canteens;
    const canteenIds = new Set(filteredDishes.map(d => d.canteenId));
    return canteens.filter(c => canteenIds.has(c.id));
  }, [canteens, filteredDishes, searchQuery]);

  // 渲染食堂列表
  const renderCanteenSection = (canteen: Canteen) => {
    const canteenDishes = (searchQuery.trim() ? filteredDishes : dishes).filter(d => d.canteenId === canteen.id);
    const isExpanded = expandedCanteens.has(canteen.id);
    
    return (
      <View key={canteen.id} style={styles.canteenSection}>
        {/* 食堂头部 */}
        <View style={styles.canteenHeader}>
          <PressableScale
            onPress={() => toggleCanteenExpanded(canteen.id)}
            style={styles.canteenTitleArea}
          >
            <List.Icon icon="store" color={colors.accent} />
            <View style={styles.canteenTitleText}>
              <Text style={styles.canteenName}>{canteen.name}</Text>
              <Text style={styles.canteenDescription}>
                {canteenDishes.length} 个菜品{canteen.location ? ` · ${canteen.location}` : ''}
              </Text>
            </View>
          </PressableScale>
          
          {/* 操作按钮 - 独立的点击区域 */}
          <View style={styles.canteenActions}>
            <IconButton
              icon="plus"
              size={20}
              onPress={() => openAddDishModal(canteen)}
            />
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => openEditCanteenModal(canteen)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor="#e53935"
              onPress={() => handleDeleteCanteen(canteen)}
            />
          </View>
        </View>
        
        {/* 菜品列表 */}
        {isExpanded && (
          <View style={styles.dishesContainer}>
            {canteenDishes.length === 0 ? (
              <Text style={styles.emptyText}>暂无菜品，点击 + 添加</Text>
            ) : (
              canteenDishes.map(dish => (
                <DishItem
                  key={dish.id}
                  dish={dish}
                  onEdit={openEditDishModal}
                  onDelete={handleDeleteDish}
                  onToggleAvailable={() => toggleDishAvailability(dish.id)}
                />
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* 搜索栏 */}
        {canteens.length > 0 && (
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="搜索菜品名称或分类..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              mode="outlined"
              dense
              left={<TextInput.Icon icon="magnify" />}
              right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : undefined}
              style={styles.searchInput}
              outlineStyle={styles.searchOutline}
            />
            {searchQuery.trim() !== '' && (
              <Text style={styles.searchResult}>
                找到 {filteredDishes.length} 个菜品
              </Text>
            )}
          </View>
        )}

        {canteens.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>还没有添加食堂</Text>
            <Text style={styles.emptySubtitle}>添加食堂和菜品后，AI 才能为你推荐每日三餐</Text>
            <PressableScale onPress={openAddCanteenModal} style={styles.emptyActionButton}>
              <Text style={styles.emptyActionText}>添加第一个食堂</Text>
            </PressableScale>
          </View>
        ) : (
          <View style={styles.canteenList}>
            {visibleCanteens.map(renderCanteenSection)}
          </View>
        )}
      </ScrollView>

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'store-plus',
            label: '添加食堂',
            onPress: openAddCanteenModal,
          },
          {
            icon: 'camera',
            label: '拍照导入菜单',
            onPress: openPhotoImport,
          },
        ]}
        onStateChange={({open}) => setFabOpen(open)}
        style={styles.fabGroup}
        fabStyle={styles.fab}
        backdropColor="transparent"
      />

      {/* 拍照导入弹窗 */}
      <PhotoImportModal
        visible={photoImportVisible}
        onDismiss={() => setPhotoImportVisible(false)}
        onImport={handlePhotoImport}
        apiConfig={config}
      />

      {/* 食堂编辑弹窗 */}
      <AnimatedModal
        visible={modalMode === 'addCanteen' || modalMode === 'editCanteen'}
        onDismiss={() => setModalMode('none')}
        contentContainerStyle={styles.modal}
      >
        <Text style={styles.modalTitle}>
          {modalMode === 'addCanteen' ? '添加食堂' : '编辑食堂'}
        </Text>
        
        <TextInput
          label="食堂名称"
          value={canteenName}
          onChangeText={setCanteenName}
          mode="outlined"
          style={styles.input}
        />
        
        <TextInput
          label="位置（选填）"
          value={canteenLocation}
          onChangeText={setCanteenLocation}
          mode="outlined"
          style={styles.input}
        />
        
        <View style={styles.modalActions}>
          <PressableScale 
            onPress={() => setModalMode('none')} 
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonTextOutlined}>取消</Text>
          </PressableScale>
          <PressableScale 
            onPress={handleSaveCanteen} 
            style={[styles.modalButton, styles.modalButtonContained]}
          >
            <Text style={styles.modalButtonTextContained}>保存</Text>
          </PressableScale>
        </View>
      </AnimatedModal>

      {/* 菜品编辑弹窗 */}
      <AnimatedModal
        visible={modalMode === 'addDish' || modalMode === 'editDish'}
        onDismiss={() => setModalMode('none')}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>
            {modalMode === 'addDish' ? '添加菜品' : '编辑菜品'}
          </Text>
          
          <TextInput
            label="菜品名称"
            value={dishName}
            onChangeText={setDishName}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="价格"
            value={dishPrice}
            onChangeText={setDishPrice}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="¥" />}
            style={styles.input}
          />
          
          <TextInput
            label="窗口名称（选填）"
            value={dishWindow}
            onChangeText={setDishWindow}
            mode="outlined"
            style={styles.input}
          />
          
          <Text style={styles.sectionLabel}>分类</Text>
          <View style={styles.categoryContainer}>
            {(Object.keys(DISH_CATEGORY_LABELS) as DishCategory[]).map(cat => (
              <Chip
                key={cat}
                selected={dishCategory === cat}
                onPress={() => setDishCategory(cat)}
                style={styles.categoryChip}
              >
                {DISH_CATEGORY_LABELS[cat]}
              </Chip>
            ))}
          </View>
          
          <Text style={styles.sectionLabel}>营养标签（可多选）</Text>
          <View style={styles.tagsContainer}>
            {(Object.keys(NUTRITION_TAG_LABELS) as NutritionTag[]).map(tag => (
              <Chip
                key={tag}
                selected={dishTags.includes(tag)}
                onPress={() => toggleTag(tag)}
                style={styles.tagChip}
              >
                {NUTRITION_TAG_LABELS[tag]}
              </Chip>
            ))}
          </View>
          
          <View style={styles.modalActions}>
            <PressableScale 
              onPress={() => setModalMode('none')} 
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonTextOutlined}>取消</Text>
            </PressableScale>
            <PressableScale 
              onPress={handleSaveDish} 
              style={[styles.modalButton, styles.modalButtonContained]}
            >
              <Text style={styles.modalButtonTextContained}>保存</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </AnimatedModal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface,
    fontSize: 14,
  },
  searchOutline: {
    borderRadius: radius.md,
    borderColor: colors.border,
  },
  searchResult: {
    ...typography.caption1,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.subhead,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyActionText: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
  emptyText: {
    padding: spacing.lg,
    color: colors.text.tertiary,
    ...typography.subhead,
  },
  canteenList: {
    padding: spacing.md,
  },
  canteenSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  canteenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  canteenTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  canteenTitleText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  canteenName: {
    ...typography.headline,
    color: colors.text.primary,
  },
  canteenDescription: {
    ...typography.caption1,
    color: colors.text.secondary,
    marginTop: 2,
  },
  canteenActions: {
    flexDirection: 'row',
  },
  dishesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    paddingVertical: spacing.sm,
  },
  fabGroup: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
  },
  fab: {
    elevation: 0,
    shadowOpacity: 0,
    backgroundColor: colors.accent,
  },
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  modalTitle: {
    ...typography.title2,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tagChip: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonContained: {
    backgroundColor: colors.accent,
  },
  modalButtonTextOutlined: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalButtonTextContained: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.surface,
  },
});

export default MenuScreen;
