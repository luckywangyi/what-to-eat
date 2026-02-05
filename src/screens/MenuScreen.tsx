import React, {useState, useEffect, useCallback} from 'react';
import {View, ScrollView, StyleSheet, Alert} from 'react-native';
import {
  Text,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
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

type ModalMode = 'none' | 'addCanteen' | 'editCanteen' | 'addDish' | 'editDish';

export const MenuScreen: React.FC = () => {
  const [modalMode, setModalMode] = useState<ModalMode>('none');
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [photoImportVisible, setPhotoImportVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
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

  // 渲染食堂列表
  const renderCanteenSection = (canteen: Canteen) => {
    const canteenDishes = dishes.filter(d => d.canteenId === canteen.id);
    
    return (
      <List.Accordion
        key={canteen.id}
        title={canteen.name}
        description={`${canteenDishes.length} 个菜品${canteen.location ? ` · ${canteen.location}` : ''}`}
        left={props => <List.Icon {...props} icon="store" />}
        right={props => (
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
        )}
      >
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
      </List.Accordion>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {canteens.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>还没有添加食堂</Text>
            <Text style={styles.emptySubtitle}>点击右下角按钮添加食堂</Text>
          </View>
        ) : (
          <List.Section>
            {canteens.map(renderCanteenSection)}
          </List.Section>
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
      />

      {/* 拍照导入弹窗 */}
      <PhotoImportModal
        visible={photoImportVisible}
        onDismiss={() => setPhotoImportVisible(false)}
        onImport={handlePhotoImport}
        apiConfig={config}
      />

      {/* 食堂编辑弹窗 */}
      <Portal>
        <Modal
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
            <Button onPress={() => setModalMode('none')}>取消</Button>
            <Button mode="contained" onPress={handleSaveCanteen}>
              保存
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* 菜品编辑弹窗 */}
      <Portal>
        <Modal
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
              <Button onPress={() => setModalMode('none')}>取消</Button>
              <Button mode="contained" onPress={handleSaveDish}>
                保存
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  emptyText: {
    padding: 16,
    color: '#888',
    fontStyle: 'italic',
  },
  canteenActions: {
    flexDirection: 'row',
  },
  fabGroup: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export default MenuScreen;
