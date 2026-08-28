import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface StudentAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  students: Student[];
  initialSelectedIds: string[];
}

export function StudentAssignmentModal({
  visible,
  onClose,
  onConfirm,
  students,
  initialSelectedIds,
}: StudentAssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setSelectedIds(initialSelectedIds);
      setSearchQuery('');
    }
  }, [visible, initialSelectedIds]);

  const filteredStudents = students.filter((student) =>
    (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedIds(students.map((s) => s.id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: '#09090B',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: '#27272A',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>
              Gerenciar Atribuições
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ padding: 16 }}>
            <View
              style={{
                backgroundColor: '#18181B',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                marginBottom: 12,
              }}
            >
              <Ionicons name="search" size={20} color="#A1A1AA" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar aluno..."
                placeholderTextColor="#52525B"
                style={{
                  flex: 1,
                  color: '#FFFFFF',
                  fontSize: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                }}
              />
            </View>

            {/* Select All / Clear All */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={selectAll}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0, 217, 255, 0.1)',
                  borderWidth: 1,
                  borderColor: '#00D9FF',
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#00D9FF', fontSize: 13, fontWeight: '600' }}>
                  Selecionar Todos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearAll}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255, 59, 59, 0.1)',
                  borderWidth: 1,
                  borderColor: '#FF3B3B',
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FF3B3B', fontSize: 13, fontWeight: '600' }}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Student List */}
          <ScrollView style={{ maxHeight: 400 }}>
            {filteredStudents.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color="#52525B"
                  style={{ marginBottom: 12 }}
                />
                <Text style={{ color: '#A1A1AA', textAlign: 'center' }}>
                  {searchQuery ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
                </Text>
              </View>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedIds.includes(student.id);
                return (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => toggleStudent(student.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#27272A',
                      backgroundColor: isSelected ? 'rgba(0, 217, 255, 0.05)' : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isSelected ? '#00D9FF' : '#52525B',
                        backgroundColor: isSelected ? '#00D9FF' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="#09090B" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 16,
                          fontWeight: '600',
                          marginBottom: 2,
                        }}
                      >
                        {student.full_name || 'Sem nome'}
                      </Text>
                      <Text style={{ color: '#A1A1AA', fontSize: 13 }}>{student.email}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: '#27272A',
            }}
          >
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: '#00D9FF',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#09090B', fontSize: 16, fontWeight: '700' }}>
                Confirmar Alterações
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
