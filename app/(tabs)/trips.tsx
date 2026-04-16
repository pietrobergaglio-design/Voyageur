import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, Modal, Switch, Image, Alert,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppStore } from '../../src/stores/useAppStore';
import { mockTokyoTrip } from '../../src/data/mockTrip';
import {
  SLOT_RANGES, getSlotForHour,
  generateSuggestionsForTrip,
  type AISuggestion, type SlotId,
} from '../../src/data/mockItinerary';
import type { TripItem } from '../../src/types/trip';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../src/constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTACHMENTS = 5;
const ATTACHMENT_DIR = FileSystem.documentDirectory + 'voyageur_attachments/';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManualEvent {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  slotId: SlotId;
  attachments: string[]; // stable file:// URIs
}

type EditingState = {
  dayIndex: number;
  slotId: SlotId;
  defaultStart: string;
  defaultEnd: string;
  existingId?: string;
  startTime: string;
  endTime: string;
  title: string;
  attachments: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');
const parseHour = (t: string) => parseInt(t.split(':')[0] ?? '9', 10);

function formatPrice(yen: number) {
  if (yen < 1000) return `${yen} ¥`;
  return `${(yen / 150).toFixed(0)} €`;
}

async function ensureAttachmentDir() {
  const info = await FileSystem.getInfoAsync(ATTACHMENT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ATTACHMENT_DIR, { intermediates: true });
  }
}

async function copyToLocal(tempUri: string): Promise<string> {
  await ensureAttachmentDir();
  const ext = tempUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const dest = ATTACHMENT_DIR + `img_${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

async function deleteAttachment(uri: string) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // silently ignore
  }
}

async function requestPermission(type: 'library' | 'camera'): Promise<boolean> {
  if (type === 'library') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimePicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const parts = value.split(':');
  const h = parseInt(parts[0] ?? '9', 10);
  const m = parseInt(parts[1] ?? '0', 10);

  return (
    <View style={tpStyles.container}>
      <Text style={tpStyles.label}>{label}</Text>
      <View style={tpStyles.picker}>
        <View style={tpStyles.unit}>
          <TouchableOpacity
            onPress={() => onChange(`${pad(Math.min(23, h + 1))}:${pad(m)}`)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={tpStyles.arrow}>▲</Text>
          </TouchableOpacity>
          <Text style={tpStyles.digit}>{pad(h)}</Text>
          <TouchableOpacity
            onPress={() => onChange(`${pad(Math.max(0, h - 1))}:${pad(m)}`)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={tpStyles.arrow}>▼</Text>
          </TouchableOpacity>
        </View>
        <Text style={tpStyles.colon}>:</Text>
        <View style={tpStyles.unit}>
          <TouchableOpacity
            onPress={() => onChange(`${pad(h)}:${pad((m + 15) % 60)}`)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={tpStyles.arrow}>▲</Text>
          </TouchableOpacity>
          <Text style={tpStyles.digit}>{pad(m)}</Text>
          <TouchableOpacity
            onPress={() => onChange(`${pad(h)}:${pad(Math.max(0, m - 15))}`)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text style={tpStyles.arrow}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const tpStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  label: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unit: { alignItems: 'center', gap: 2 },
  arrow: { fontSize: 11, color: Colors.text.muted, lineHeight: 16 },
  digit: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    minWidth: 34,
    textAlign: 'center',
  },
  colon: {
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.xl,
    color: Colors.text.primary,
    marginBottom: 2,
  },
});

// ─── ImageViewerModal ─────────────────────────────────────────────────────────

function ImageViewerModal({
  uris,
  startIndex,
  onClose,
}: {
  uris: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={ivStyles.backdrop}>
        <TouchableOpacity
          style={[ivStyles.closeBtn, { top: Math.max(insets.top + 12, 56) }]}
          onPress={onClose}
        >
          <Text style={ivStyles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Image
          source={{ uri: uris[current] }}
          style={ivStyles.image}
          resizeMode="contain"
        />

        {uris.length > 1 && (
          <View style={ivStyles.nav}>
            <TouchableOpacity
              style={[ivStyles.navBtn, current === 0 && ivStyles.navBtnDisabled]}
              onPress={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <Text style={ivStyles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <Text style={ivStyles.navCount}>{current + 1} / {uris.length}</Text>
            <TouchableOpacity
              style={[ivStyles.navBtn, current === uris.length - 1 && ivStyles.navBtnDisabled]}
              onPress={() => setCurrent((c) => Math.min(uris.length - 1, c + 1))}
              disabled={current === uris.length - 1}
            >
              <Text style={ivStyles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ivStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: '#fff',
  },
  image: { width: '100%', height: '80%' },
  nav: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 24,
    color: '#fff',
    lineHeight: 28,
  },
  navCount: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
});

// ─── AttachmentBar ────────────────────────────────────────────────────────────

function AttachmentBar({
  attachments,
  onAdd,
  onRemove,
  onView,
}: {
  attachments: string[];
  onAdd: () => void;
  onRemove: (uri: string) => void;
  onView: (index: number) => void;
}) {
  const canAdd = attachments.length < MAX_ATTACHMENTS;

  return (
    <View style={abStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={abStyles.scrollContent}
      >
        {/* Add button */}
        {canAdd && (
          <TouchableOpacity style={abStyles.addBtn} onPress={onAdd} activeOpacity={0.75}>
            <Text style={abStyles.addBtnIcon}>📎</Text>
            <Text style={abStyles.addBtnText}>Allega</Text>
          </TouchableOpacity>
        )}

        {/* Thumbnail list */}
        {attachments.map((uri, idx) => (
          <View key={uri} style={abStyles.thumb}>
            <TouchableOpacity onPress={() => onView(idx)} activeOpacity={0.85}>
              <Image source={{ uri }} style={abStyles.thumbImage} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity
              style={abStyles.thumbRemove}
              onPress={() => onRemove(uri)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={abStyles.thumbRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!canAdd && (
          <Text style={abStyles.maxNote}>Max {MAX_ATTACHMENTS}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const abStyles = StyleSheet.create({
  container: {},
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 56,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
  },
  addBtnIcon: { fontSize: 18 },
  addBtnText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    overflow: 'visible',
    position: 'relative',
  },
  thumbImage: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  thumbRemoveText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 9,
    color: Colors.white,
    lineHeight: 12,
  },
  maxNote: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
  },
});

// ─── InlineEditor ─────────────────────────────────────────────────────────────

function InlineEditor({
  editing,
  onSave,
  onCancel,
}: {
  editing: EditingState;
  onSave: (title: string, startTime: string, endTime: string, attachments: string[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(editing.title);
  const [start, setStart] = useState(editing.startTime);
  const [end, setEnd] = useState(editing.endTime);
  const [attachments, setAttachments] = useState<string[]>(editing.attachments);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const openPicker = useCallback(async () => {
    const pick = async (type: 'library' | 'camera') => {
      const granted = await requestPermission(type);
      if (!granted) {
        Alert.alert(
          'Permesso negato',
          type === 'library'
            ? 'Consenti l\'accesso alla galleria nelle impostazioni.'
            : 'Consenti l\'accesso alla fotocamera nelle impostazioni.',
        );
        return;
      }

      const result = type === 'library'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.8,
          })
        : await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

      if (result.canceled || !result.assets[0]) return;

      try {
        const stable = await copyToLocal(result.assets[0].uri);
        setAttachments((prev) => [...prev, stable]);
      } catch {
        Alert.alert('Errore', 'Impossibile salvare l\'immagine. Riprova.');
      }
    };

    Alert.alert('Allega immagine', 'Scegli sorgente', [
      { text: '🖼 Galleria', onPress: () => pick('library') },
      { text: '📷 Fotocamera', onPress: () => pick('camera') },
      { text: 'Annulla', style: 'cancel' },
    ]);
  }, []);

  const removeAttachment = useCallback(async (uri: string) => {
    await deleteAttachment(uri);
    setAttachments((prev) => prev.filter((u) => u !== uri));
  }, []);

  return (
    <>
      <View style={edStyles.container}>
        {/* Time row */}
        <View style={edStyles.timeRow}>
          <TimePicker label="Inizio" value={start} onChange={setStart} />
          <View style={edStyles.timeDash} />
          <TimePicker label="Fine" value={end} onChange={setEnd} />
        </View>

        {/* Title input */}
        <TextInput
          style={edStyles.input}
          placeholder="Aggiungi nota (es. Sushi da Jiro, Passeggiata al parco…)"
          placeholderTextColor={Colors.text.muted}
          value={title}
          onChangeText={setTitle}
          multiline
          numberOfLines={2}
          returnKeyType="done"
        />

        {/* Attachment bar */}
        <AttachmentBar
          attachments={attachments}
          onAdd={openPicker}
          onRemove={removeAttachment}
          onView={(idx) => setViewerIndex(idx)}
        />

        {/* Action buttons */}
        <View style={edStyles.btnRow}>
          <TouchableOpacity style={edStyles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={edStyles.cancelText}>Annulla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[edStyles.saveBtn, !title.trim() && edStyles.saveBtnDisabled]}
            onPress={() => title.trim() && onSave(title.trim(), start, end, attachments)}
            activeOpacity={0.85}
            disabled={!title.trim()}
          >
            <Text style={edStyles.saveText}>Salva</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewerIndex !== null && (
        <ImageViewerModal
          uris={attachments}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

const edStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  timeDash: { width: 16, height: 1.5, backgroundColor: Colors.border },
  input: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  saveBtn: {
    flex: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: Colors.accent + '55' },
  saveText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});

// ─── BookingCard ──────────────────────────────────────────────────────────────

interface BookingDisplay {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  timeLabel?: string;
  isAllDay?: boolean;
}

function BookingCard({ b }: { b: BookingDisplay }) {
  return (
    <View style={bcStyles.card}>
      <View style={bcStyles.left}>
        <View style={bcStyles.circle}>
          <Text style={bcStyles.emoji}>{b.emoji}</Text>
        </View>
        {b.timeLabel && <Text style={bcStyles.time}>{b.timeLabel}</Text>}
        {b.isAllDay && <Text style={bcStyles.allDay}>Tutto il giorno</Text>}
      </View>
      <View style={bcStyles.info}>
        <Text style={bcStyles.title} numberOfLines={1}>{b.title}</Text>
        <Text style={bcStyles.subtitle} numberOfLines={1}>{b.subtitle}</Text>
      </View>
    </View>
  );
}

const bcStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  left: { alignItems: 'center', gap: 3, minWidth: 44 },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.navy + '0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  time: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.navy },
  allDay: { fontFamily: FontFamily.body, fontSize: 9, color: Colors.text.muted },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.text.primary },
  subtitle: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.secondary },
});

// ─── ManualCard ───────────────────────────────────────────────────────────────

function ManualCard({
  event,
  onEdit,
  onDelete,
}: {
  event: ManualEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <TouchableOpacity style={mcStyles.card} onPress={onEdit} activeOpacity={0.8}>
        <View style={mcStyles.left}>
          <Text style={mcStyles.icon}>📝</Text>
          <Text style={mcStyles.time}>{event.startTime}</Text>
        </View>

        <View style={mcStyles.body}>
          <View style={mcStyles.topRow}>
            <Text style={mcStyles.title} numberOfLines={2}>{event.title}</Text>
            <TouchableOpacity
              onPress={onDelete}
              style={mcStyles.delBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={mcStyles.delText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={mcStyles.meta}>{event.startTime} – {event.endTime}</Text>

          {/* Attachment thumbnails */}
          {event.attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={mcStyles.thumbRow}
            >
              {event.attachments.map((uri, idx) => (
                <TouchableOpacity
                  key={uri}
                  onPress={(e) => {
                    e.stopPropagation();
                    setViewerIndex(idx);
                  }}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri }}
                    style={mcStyles.thumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>

      {viewerIndex !== null && (
        <ImageViewerModal
          uris={event.attachments}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}

const mcStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.teal + '0A',
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.teal + '35',
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  left: { alignItems: 'center', gap: 2, minWidth: 44, paddingTop: 2 },
  icon: { fontSize: 18 },
  time: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: Colors.teal },
  body: { flex: 1, gap: Spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  title: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },
  meta: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  delBtn: { paddingLeft: 4, paddingTop: 2 },
  delText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.muted },
  thumbRow: { gap: Spacing.xs, paddingTop: 2 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});

// ─── EmptySlotRow ─────────────────────────────────────────────────────────────

function EmptySlotRow({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <TouchableOpacity style={esStyles.row} onPress={onTap} activeOpacity={0.7}>
      <Text style={esStyles.plus}>+</Text>
      <Text style={esStyles.label}>{label}</Text>
      <Text style={esStyles.hint}>Aggiungi nota</Text>
    </TouchableOpacity>
  );
}

const esStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    minHeight: 44,
  },
  plus: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.text.muted },
  label: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.sm, color: Colors.text.secondary, flex: 1 },
  hint: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
});

// ─── AISuggestionCard ─────────────────────────────────────────────────────────

function AISuggestionCard({
  suggestion,
  expanded,
  onToggle,
  onRemove,
}: {
  suggestion: AISuggestion;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={aiStyles.card}>
      <TouchableOpacity style={aiStyles.compactRow} onPress={onToggle} activeOpacity={0.8}>
        <View style={aiStyles.aiBadge}>
          <Text style={aiStyles.aiBadgeText}>✨</Text>
        </View>
        <View style={aiStyles.compactInfo}>
          <View style={aiStyles.compactTop}>
            <Text style={aiStyles.compactName} numberOfLines={1}>
              {suggestion.emoji} {suggestion.name}
            </Text>
            <Text style={aiStyles.compactTime}>{suggestion.slotSuggestion}</Text>
          </View>
          <Text style={aiStyles.compactTagline} numberOfLines={1}>{suggestion.tagline}</Text>
        </View>
        <TouchableOpacity
          onPress={onRemove}
          style={aiStyles.xBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={aiStyles.xBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {!expanded && (
        <TouchableOpacity style={aiStyles.expandBtn} onPress={onToggle} activeOpacity={0.7}>
          <Text style={aiStyles.expandText}>Espandi ↓</Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <View style={aiStyles.expandedContent}>
          <View style={aiStyles.imagePlaceholder}>
            <Text style={aiStyles.imageEmoji}>{suggestion.emoji}</Text>
          </View>

          <Text style={aiStyles.description}>{suggestion.description}</Text>

          <View style={aiStyles.metaRow}>
            {suggestion.bestLight && (
              <Text style={aiStyles.metaBadge}>📸 {suggestion.bestLight}</Text>
            )}
            <Text style={aiStyles.metaBadge}>☀️ 28°C · lug</Text>
            {suggestion.companionNote && (
              <Text style={aiStyles.metaBadge}>{suggestion.companionNote}</Text>
            )}
            <Text style={aiStyles.metaBadge}>⏱ {suggestion.duration}</Text>
          </View>

          <View style={aiStyles.tagRow}>
            {suggestion.tags.map((tag) => (
              <View key={tag} style={aiStyles.tag}>
                <Text style={aiStyles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          <View style={aiStyles.ctaRow}>
            {suggestion.isFree ? (
              <View style={aiStyles.freeBadge}>
                <Text style={aiStyles.freeBadgeText}>🆓 Gratis</Text>
              </View>
            ) : (
              <TouchableOpacity style={aiStyles.bookBtn} activeOpacity={0.8}>
                <Text style={aiStyles.bookBtnText}>
                  Prenota · {formatPrice(suggestion.price ?? 0)}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={aiStyles.collapseBtn} onPress={onToggle} activeOpacity={0.7}>
              <Text style={aiStyles.collapseText}>Comprimi ↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const aiStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.accent + '07',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.accent + '35',
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    minHeight: 44,
  },
  aiBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiBadgeText: { fontSize: 13 },
  compactInfo: { flex: 1, gap: 2 },
  compactTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  compactName: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.text.primary, flex: 1 },
  compactTime: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  compactTagline: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.secondary },
  xBtn: { paddingLeft: 4, minWidth: 24, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  xBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.muted },
  expandBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.accent + '20',
    minHeight: 44,
    justifyContent: 'center',
  },
  expandText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.accent },
  expandedContent: { gap: Spacing.sm, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.navy + '20',
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: { fontSize: 48 },
  description: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 21,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  metaBadge: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.text.muted,
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.secondary },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', paddingTop: Spacing.xs },
  freeBadge: {
    flex: 1,
    backgroundColor: Colors.teal + '15',
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.teal + '30',
  },
  freeBadgeText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.teal },
  bookBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    alignItems: 'center',
  },
  bookBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.white },
  collapseBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
  collapseText: { fontFamily: FontFamily.bodyMedium, fontSize: FontSize.xs, color: Colors.text.muted },
});

// ─── AI Config Modal ──────────────────────────────────────────────────────────

function AIConfigModal({
  visible,
  density,
  includeMeals,
  onChangeDensity,
  onChangeMeals,
  onGenerate,
  onClose,
}: {
  visible: boolean;
  density: number;
  includeMeals: boolean;
  onChangeDensity: (v: number) => void;
  onChangeMeals: (v: boolean) => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const DENSITY_STOPS = [
    { value: 0,   label: 'Rilassato', sub: '1 suggerimento/giorno' },
    { value: 33,  label: 'Equilibrato', sub: '2 suggerimenti/giorno' },
    { value: 66,  label: 'Dinamico', sub: '3 suggerimenti/giorno' },
    { value: 100, label: 'Intenso', sub: '4–5 suggerimenti/giorno' },
  ];

  const activeStop = DENSITY_STOPS.reduce((prev, curr) =>
    Math.abs(curr.value - density) < Math.abs(prev.value - density) ? curr : prev,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={cfgStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={cfgStyles.sheet}>
        <View style={cfgStyles.handle} />
        <Text style={cfgStyles.sheetTitle}>Configura itinerario AI</Text>

        <View style={cfgStyles.section}>
          <View style={cfgStyles.sectionHeader}>
            <Text style={cfgStyles.sectionLabel}>Quanto riempire?</Text>
            <Text style={cfgStyles.activeStopLabel}>{activeStop.label}</Text>
          </View>
          <Text style={cfgStyles.activeStopSub}>{activeStop.sub}</Text>
          <View style={cfgStyles.stopRow}>
            {DENSITY_STOPS.map((stop) => {
              const isActive = Math.abs(stop.value - density) < 17;
              return (
                <TouchableOpacity
                  key={stop.value}
                  style={[cfgStyles.stopBtn, isActive && cfgStyles.stopBtnActive]}
                  onPress={() => onChangeDensity(stop.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[cfgStyles.stopBtnText, isActive && cfgStyles.stopBtnTextActive]}>
                    {stop.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={cfgStyles.section}>
          <View style={cfgStyles.toggleRow}>
            <View style={cfgStyles.toggleInfo}>
              <Text style={cfgStyles.sectionLabel}>Includi suggerimenti pasti?</Text>
              <Text style={cfgStyles.toggleSub}>
                {includeMeals
                  ? 'Pranzo e cena suggeriti nei giorni liberi'
                  : 'Solo attività ed esperienze'}
              </Text>
            </View>
            <Switch
              value={includeMeals}
              onValueChange={onChangeMeals}
              trackColor={{ false: Colors.border, true: Colors.accent + '60' }}
              thumbColor={includeMeals ? Colors.accent : Colors.text.muted}
            />
          </View>
        </View>

        <TouchableOpacity style={cfgStyles.generateBtn} onPress={onGenerate} activeOpacity={0.85}>
          <Text style={cfgStyles.generateBtnText}>Genera ✨</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const cfgStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary },
  section: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.text.primary },
  activeStopLabel: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.sm, color: Colors.accent },
  activeStopSub: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  stopRow: { flexDirection: 'row', gap: 6 },
  stopBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  stopBtnActive: { backgroundColor: Colors.accent + '15', borderColor: Colors.accent + '50' },
  stopBtnText: { fontFamily: FontFamily.bodyMedium, fontSize: 11, color: Colors.text.muted, textAlign: 'center' },
  stopBtnTextActive: { color: Colors.accent },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleInfo: { flex: 1, gap: 2 },
  toggleSub: { fontFamily: FontFamily.body, fontSize: FontSize.xs, color: Colors.text.muted },
  generateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 52,
    justifyContent: 'center',
  },
  generateBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ITEM_EMOJI: Record<TripItem['type'], string> = {
  flight: '✈️', hotel: '🏨', activity: '🎟️', transport: '🚆', insurance: '🛡️',
};

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const storeTrips = useAppStore((s) => s.trips);
  const profile = useAppStore((s) => s.onboardingData);

  const trip = storeTrips.length > 0 ? storeTrips[0] : mockTokyoTrip;
  const checkIn = new Date(2026, 6, 15);
  const checkOut = new Date(2026, 6, 22);

  const msPerDay = 86_400_000;
  const totalDays = Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay) + 1;

  const [manualByDay, setManualByDay] = useState<Record<number, ManualEvent[]>>({});
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [expandedSuggs, setExpandedSuggs] = useState<Set<string>>(new Set());
  const [removedSuggIds, setRemovedSuggIds] = useState<Set<string>>(new Set());
  const [generated, setGenerated] = useState(false);
  const [regenKey, setRegenKey] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [density, setDensity] = useState(50);
  const [includeMeals, setIncludeMeals] = useState(true);

  const days = useMemo(() => {
    const fmt = (d: Date) =>
      d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

    return Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(checkIn.getTime() + i * msPerDay);
      const dayBookings: BookingDisplay[] = [];

      for (const item of trip.items) {
        if (item.type === 'insurance') continue;
        let showOnDay = false;

        if (item.departureAt) {
          const d = new Date(item.departureAt);
          showOnDay =
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate();
        } else if (item.type === 'hotel' && i === 0) {
          showOnDay = true;
        } else if (item.type === 'transport' && i === 0) {
          showOnDay = true;
        }

        if (!showOnDay) continue;

        let timeLabel: string | undefined;
        if (item.departureAt) {
          const d = new Date(item.departureAt);
          timeLabel = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        dayBookings.push({
          id: item.id,
          emoji: ITEM_EMOJI[item.type],
          title: item.title,
          subtitle: item.subtitle,
          timeLabel,
          isAllDay: !item.departureAt,
        });
      }

      return {
        date,
        dayIndex: i,
        dayLabel: `Giorno ${i + 1}`,
        dateLabel: fmt(date),
        bookings: dayBookings,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const takenSlotsByDay = useMemo<Set<SlotId>[]>(() => {
    return days.map((day) => {
      const taken = new Set<SlotId>();
      for (const b of day.bookings) {
        if (b.timeLabel) taken.add(getSlotForHour(parseHour(b.timeLabel)));
      }
      for (const m of manualByDay[day.dayIndex] ?? []) {
        taken.add(getSlotForHour(parseHour(m.startTime)));
      }
      return taken;
    });
  }, [days, manualByDay]);

  const suggestionsByDay = useMemo<AISuggestion[][]>(() => {
    if (!generated) return days.map(() => []);
    return generateSuggestionsForTrip(
      totalDays,
      takenSlotsByDay,
      profile,
      density,
      includeMeals,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, regenKey, density, includeMeals, profile, takenSlotsByDay]);

  function openEditor(dayIndex: number, slot: (typeof SLOT_RANGES)[0], existingId?: string, existingManual?: ManualEvent) {
    setEditing({
      dayIndex,
      slotId: slot.id,
      defaultStart: slot.defaultStart,
      defaultEnd: slot.defaultEnd,
      existingId,
      startTime: existingManual?.startTime ?? slot.defaultStart,
      endTime: existingManual?.endTime ?? slot.defaultEnd,
      title: existingManual?.title ?? '',
      attachments: existingManual?.attachments ?? [],
    });
  }

  function saveEdit(title: string, startTime: string, endTime: string, attachments: string[]) {
    if (!editing) return;
    const { dayIndex, slotId, existingId } = editing;

    setManualByDay((prev) => {
      const dayEvents = [...(prev[dayIndex] ?? [])];
      if (existingId) {
        const idx = dayEvents.findIndex((e) => e.id === existingId);
        if (idx >= 0) {
          dayEvents[idx] = { ...dayEvents[idx], title, startTime, endTime, attachments };
        }
      } else {
        dayEvents.push({
          id: `manual-${Date.now()}`,
          startTime,
          endTime,
          title,
          slotId,
          attachments,
        });
      }
      return { ...prev, [dayIndex]: dayEvents };
    });
    setEditing(null);
  }

  function deleteManual(dayIndex: number, eventId: string) {
    // Extract attachments to delete BEFORE updating state (avoid side-effects inside updater)
    const toDelete = (manualByDay[dayIndex] ?? []).find((e) => e.id === eventId)?.attachments ?? [];
    toDelete.forEach((uri) => deleteAttachment(uri));

    setManualByDay((prev) => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] ?? []).filter((e) => e.id !== eventId),
    }));
    if (editing?.existingId === eventId) setEditing(null);
  }

  function handleGenerate() {
    setRemovedSuggIds(new Set());
    setShowConfig(false);
    setGenerated(true);
  }

  function handleRegen() {
    setRemovedSuggIds(new Set());
    setRegenKey((k) => k + 1);
  }

  function toggleExpanded(id: string) {
    setExpandedSuggs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.flag}>{trip.coverEmoji}</Text>
        <View>
          <Text style={styles.destination}>{trip.destination}</Text>
          <Text style={styles.dates}>{trip.dateRange}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}
      >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {days.map((day) => {
          const dayManuals = manualByDay[day.dayIndex] ?? [];
          const daySuggs = (suggestionsByDay[day.dayIndex] ?? []).filter(
            (s) => !removedSuggIds.has(s.id),
          );

          const allDayBookings = day.bookings.filter((b) => b.isAllDay);
          const timedBookings = day.bookings.filter((b) => !b.isAllDay);

          return (
            <View key={day.dayIndex} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                <Text style={styles.dateLabel}>{day.dateLabel}</Text>
              </View>

              {allDayBookings.map((b) => <BookingCard key={b.id} b={b} />)}

              {SLOT_RANGES.map((slot) => {
                const isEditing = editing?.dayIndex === day.dayIndex && editing.slotId === slot.id;

                const booking = timedBookings.find(
                  (b) => b.timeLabel && getSlotForHour(parseHour(b.timeLabel)) === slot.id,
                );
                if (booking) return <BookingCard key={slot.id} b={booking} />;

                const manual = dayManuals.find((m) => m.slotId === slot.id);
                if (manual && !isEditing) {
                  return (
                    <ManualCard
                      key={slot.id}
                      event={manual}
                      onEdit={() => openEditor(day.dayIndex, slot, manual.id, manual)}
                      onDelete={() => deleteManual(day.dayIndex, manual.id)}
                    />
                  );
                }

                if (isEditing) {
                  return (
                    <InlineEditor
                      key={slot.id}
                      editing={editing!}
                      onSave={saveEdit}
                      onCancel={() => setEditing(null)}
                    />
                  );
                }

                const sugg = daySuggs.find((s) => s.slotSuggestion === slot.id);
                if (sugg) {
                  return (
                    <AISuggestionCard
                      key={slot.id}
                      suggestion={sugg}
                      expanded={expandedSuggs.has(sugg.id)}
                      onToggle={() => toggleExpanded(sugg.id)}
                      onRemove={() =>
                        setRemovedSuggIds((prev) => new Set([...prev, sugg.id]))
                      }
                    />
                  );
                }

                return (
                  <EmptySlotRow
                    key={slot.id}
                    label={slot.label}
                    onTap={() => openEditor(day.dayIndex, slot)}
                  />
                );
              })}
            </View>
          );
        })}

        <View style={styles.ctaArea}>
          {!generated ? (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => setShowConfig(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.generateBtnText}>✨ Genera itinerario AI</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.regenBtn} onPress={handleRegen} activeOpacity={0.85}>
              <Text style={styles.regenBtnText}>🔄 Rigenera suggerimenti</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <AIConfigModal
        visible={showConfig}
        density={density}
        includeMeals={includeMeals}
        onChangeDensity={setDensity}
        onChangeMeals={setIncludeMeals}
        onGenerate={handleGenerate}
        onClose={() => setShowConfig(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  flag: { fontSize: 28 },
  destination: { fontFamily: FontFamily.displayBold, fontSize: FontSize.xl, color: Colors.text.primary },
  dates: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.secondary },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  dayBlock: { gap: Spacing.sm },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, paddingBottom: Spacing.xs },
  dayLabel: { fontFamily: FontFamily.displayBold, fontSize: FontSize.lg, color: Colors.text.primary },
  dateLabel: { fontFamily: FontFamily.body, fontSize: FontSize.sm, color: Colors.text.muted },
  ctaArea: { marginTop: Spacing.sm },
  generateBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  generateBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.lg, color: Colors.white },
  regenBtn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 52,
    justifyContent: 'center',
  },
  regenBtnText: { fontFamily: FontFamily.bodySemiBold, fontSize: FontSize.md, color: Colors.text.secondary },
});
