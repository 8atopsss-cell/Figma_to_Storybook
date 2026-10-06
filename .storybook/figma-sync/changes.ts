export type Difference = { path: string; kind: string; before?: unknown; after?: unknown };
export type NodeContext = { name: string; type: string; theme?: string; variant?: Record<string, string>; variantRoot?: boolean; variantId?: string };
export type PaintSample = { text: string; css?: string };
export type ChangeValue = { text: string; paints?: PaintSample[]; style?: string; values?: { text: string; changed?: boolean }[] };
export type ChangeItem = { id: string; title: string; location: string; nodeId?: string;
  before: ChangeValue; after: ChangeValue; paths: string[]; description?: string };
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const parts = (path: string) => path.split('/').slice(1).map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));
const themeNames: Record<string, string> = { light: 'Светлая тема', dark: 'Тёмная тема' };
const stateNames: Record<string, string> = { enable: 'обычное', hover: 'наведение', active: 'нажатие', disable: 'недоступно', disabled: 'недоступно' };
const fields: Record<string, string> = {
  width: 'Ширина', height: 'Высота', characters: 'Текст', name: 'Название слоя', type: 'Тип слоя',
  visible: 'Видимость', opacity: 'Прозрачность', cornerRadius: 'Скругление', cornerSmoothing: 'Сглаживание углов',
  topLeftRadius: 'Левый верхний угол', topRightRadius: 'Правый верхний угол',
  bottomLeftRadius: 'Левый нижний угол', bottomRightRadius: 'Правый нижний угол',
  paddingLeft: 'Отступ слева', paddingRight: 'Отступ справа', paddingTop: 'Отступ сверху', paddingBottom: 'Отступ снизу',
  itemSpacing: 'Расстояние между элементами', counterAxisSpacing: 'Расстояние между строками',
  fontSize: 'Размер текста', fontName: 'Шрифт', fontWeight: 'Толщина текста', lineHeight: 'Высота строки',
  letterSpacing: 'Межбуквенный интервал', textCase: 'Регистр текста', textAlignHorizontal: 'Выравнивание текста',
  textDecoration: 'Оформление текста', strokeWeight: 'Толщина обводки', strokeAlign: 'Положение обводки',
  effects: 'Тени и эффекты', children: 'Состав и порядок слоёв', childCount: 'Количество слоёв',
  layoutMode: 'Расположение элементов', layoutWrap: 'Перенос элементов', rotation: 'Поворот',
  primaryAxisAlignItems: 'Выравнивание по основной оси', counterAxisAlignItems: 'Выравнивание по поперечной оси',
  variantProperties: 'Свойства варианта', componentPropertyDefinitions: 'Схема свойств',
  componentProperties: 'Свойства экземпляра', boundVariables: 'Привязки переменных',
  explicitVariableModes: 'Назначенные режимы переменных', resolvedVariableModes: 'Режимы темы',
  textStyleId: 'Стиль текста', effectStyleId: 'Стиль эффектов', minWidth: 'Минимальная ширина',
  maxWidth: 'Максимальная ширина', minHeight: 'Минимальная высота', maxHeight: 'Максимальная высота',
  relativeTransform: 'Положение и трансформация', clipsContent: 'Обрезание содержимого',
};
const pixelFields = new Set(['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'cornerRadius',
  'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'paddingLeft', 'paddingRight',
  'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing', 'fontSize', 'strokeWeight', 'x', 'y']);

export function affine(value: unknown) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(row => Array.isArray(row) && row.length === 3 && row.every(v => typeof v === 'number' && Number.isFinite(v)))) return undefined;
  const [[a, c, x], [b, d, y]] = value as number[][];
  return { a, b, c, d, x, y };
}
const rounded = (value: number) => Math.round(value * 100) / 100;
function transformText(value: unknown) {
  const matrix = affine(value);
  if (!matrix) return 'Трансформация недоступна — см. детали';
  const { a, b, c, d, x, y } = matrix;
  const scaleX = Math.hypot(a, b), scaleY = scaleX ? (a * d - b * c) / scaleX : Math.hypot(c, d);
  const angle = Math.atan2(b, a) * 180 / Math.PI;
  const skew = scaleX ? Math.atan((a * c + b * d) / (scaleX * scaleX)) * 180 / Math.PI : 0;
  return [`X: ${rounded(x)} px`, `Y: ${rounded(y)} px`,
    Math.abs(angle) > .001 ? `поворот: ${rounded(angle)}°` : '',
    Math.abs(scaleX - 1) > .001 || Math.abs(scaleY - 1) > .001 ? `масштаб: ${rounded(scaleX)} × ${rounded(scaleY)}` : '',
    Math.abs(skew) > .001 ? `наклон: ${rounded(skew)}°` : ''].filter(Boolean).join(' · ');
}

function positionDescription(before: unknown, after: unknown, context?: NodeContext) {
  const start = affine(before), end = affine(after);
  if (!start || !end) return 'Изменена трансформация слоя; точные значения — в деталях.';
  const dx = rounded(end.x - start.x), dy = rounded(end.y - start.y);
  const movement = [dx ? `${Math.abs(dx)} px ${dx > 0 ? 'вправо' : 'влево'}` : '',
    dy ? `${Math.abs(dy)} px ${dy > 0 ? 'вниз' : 'вверх'}` : ''].filter(Boolean).join(' и ');
  const icon = context?.type === 'INSTANCE' || context?.type === 'VECTOR';
  const subject = context?.type === 'TEXT' ? 'Текст смещён' : icon ? 'Иконка смещена' : 'Слой смещён';
  const linear = ['a', 'b', 'c', 'd'].some(key => Math.abs(start[key as keyof typeof start] - end[key as keyof typeof end]) > .00001);
  return [movement ? `${subject} на ${movement}.` : '', linear ? 'Изменены поворот, масштаб или наклон; параметры указаны ниже.' : ''].filter(Boolean).join(' ') || 'Положение не изменилось.';
}

export function describeValue(value: unknown, field = ''): ChangeValue {
  if (value === undefined) return { text: 'Не задано' };
  if (value === null) return { text: 'Без значения' };
  if (typeof value === 'boolean') return { text: value ? 'Да' : 'Нет' };
  if (typeof value === 'number') return { text: field === 'opacity' || field === 'cornerSmoothing'
    ? `${Math.round(value * 100)}%` : `${value}${pixelFields.has(field) ? ' px' : field === 'rotation' ? '°' : ''}` };
  if (typeof value === 'string') return { text: value || 'Пусто' };
  if (field === 'relativeTransform') return { text: transformText(value) };
  if (Array.isArray(value)) return value.every(item => typeof item === 'string')
    ? { text: value.length ? value.join(' · ') : 'Нет элементов', values: value.map(text => ({ text })) }
    : { text: value.length ? `Элементов: ${value.length}` : 'Нет элементов' };
  const data = object(value);
  if (typeof data.family === 'string') return { text: `${data.family}${typeof data.style === 'string' ? ` · ${data.style}` : ''}` };
  if (typeof data.value === 'number') return { text: `${data.value}${data.unit === 'PIXELS' ? ' px' : data.unit === 'PERCENT' ? '%' : ''}` };
  return { text: Object.keys(data).length ? 'Составное значение — см. детали' : 'Пусто' };
}

export function paintValue(value: unknown): ChangeValue {
  if (value === undefined) return describeValue(value);
  if (!Array.isArray(value)) return { text: 'Данные заливки — см. детали' };
  if (!value.length) return { text: 'Без заливки', paints: [] };
  const paints = value.map(paint => {
    const data = object(paint), color = object(data.color);
    if (data.visible === false) return { text: 'Скрытая заливка' };
    if (data.type === 'SOLID' && ['r', 'g', 'b'].every(key => typeof color[key] === 'number' && Number.isFinite(color[key]))) {
      const channel = (key: string) => Math.round(Math.max(0, Math.min(1, color[key] as number)) * 255);
      const hex = `#${['r', 'g', 'b'].map(key => channel(key).toString(16).padStart(2, '0')).join('')}`;
      const alpha = typeof data.opacity === 'number' ? data.opacity : 1;
      return { text: `${hex}${alpha === 1 ? '' : ` · ${Math.round(alpha * 100)}%`}`,
        css: `rgba(${channel('r')}, ${channel('g')}, ${channel('b')}, ${Math.max(0, Math.min(1, alpha))})` };
    }
    const names: Record<string, string> = { GRADIENT_LINEAR: 'Линейный градиент', GRADIENT_RADIAL: 'Радиальный градиент',
      GRADIENT_ANGULAR: 'Угловой градиент', GRADIENT_DIAMOND: 'Ромбовидный градиент', IMAGE: 'Изображение',
      VIDEO: 'Видео', PATTERN: 'Паттерн' };
    return { text: names[String(data.type)] ?? 'Заливка — см. детали' };
  });
  return { text: paints.map(paint => paint.text).join(', '), paints };
}

function location(context: NodeContext | undefined, nodeId: string) {
  if (!context) return `Слой ${nodeId} · контекст отсутствует в экспорте`;
  const variants = Object.entries(context.variant ?? {}).map(([key, value]) => key === 'state' ? stateNames[value] ?? value :
    key === 'size' ? value.replace(/px$/, ' px') : value);
  return [context.theme ? themeNames[context.theme] ?? context.theme : '', ...variants,
    context.variantRoot ? '' : context.name === 'icon wrapper' ? 'иконка' : context.type === 'TEXT' ? 'текст' : context.name].filter(Boolean).join(' · ') || context.name;
}

export function summarizeChanges(changes: Difference[], contexts: Record<string, NodeContext> = {},
  knownStyles: Record<string, string> = {}): ChangeItem[] {
  const nodes = { ...contexts };
  const styles = { ...knownStyles };
  for (const change of changes) {
    const [section, id, field] = parts(change.path);
    if (section === 'styles') {
      const data = object(change.after ?? change.before);
      if (typeof data.name === 'string') styles[id] = data.name;
      if (field === 'name' && typeof change.after === 'string') styles[id] = change.after;
    }
    if (section === 'nodes' && !field) {
      const node = object(change.after ?? change.before);
      if (typeof node.name === 'string') nodes[id] = { ...nodes[id], name: node.name, type: String(node.type ?? '') };
    }
    if (section === 'nodes' && field === 'name' && typeof change.after === 'string' && nodes[id]) {
      nodes[id] = { ...nodes[id], name: change.after };
    }
  }
  const consumed = new Set<string>();
  const result: ChangeItem[] = [];
  const styleName = (id: unknown) => typeof id === 'string' ? id ? styles[id] ?? `Стиль ${id}` : 'Без стиля' : 'Не задано';
  for (const change of changes) {
    if (consumed.has(change.path)) continue;
    const segments = parts(change.path), [section, id] = segments;
    if (section !== 'nodes') continue;
    const property = segments[2] === 'properties' ? segments[3] : segments[2];
    const context = nodes[id];
    if (property === 'componentPropertyDefinitions' && segments.length === 6 && segments[5] === 'variantOptions') {
      const before = describeValue(change.before), after = describeValue(change.after);
      const oldValues = before.values?.map(value => value.text), newValues = after.values?.map(value => value.text);
      const removed = oldValues && newValues ? oldValues.filter(value => !newValues.includes(value)) : [];
      const added = oldValues && newValues ? newValues.filter(value => !oldValues.includes(value)) : [];
      if (before.values) before.values = before.values.map(value => ({ ...value, changed: removed.includes(value.text) }));
      if (after.values) after.values = after.values.map(value => ({ ...value, changed: added.includes(value.text) }));
      const description = [removed.length ? `Удалено: ${removed.map(value => `«${value}»`).join(', ')}.` : '',
        added.length ? `Добавлено: ${added.map(value => `«${value}»`).join(', ')}.` : ''].filter(Boolean).join(' ');
      consumed.add(change.path);
      result.push({ id: change.path, title: `Варианты свойства «${segments[4]}»`, location: location(context, id), nodeId: id,
        before, after, description: description || 'Изменён список значений.', paths: [change.path] });
      continue;
    }
    if (property === 'x' || property === 'y') {
      const matrixChange = changes.find(item => item.path === `/nodes/${id.replaceAll('~', '~0').replaceAll('/', '~1')}/properties/relativeTransform`);
      const start = affine(matrixChange?.before), end = affine(matrixChange?.after);
      if (start && end && change.before === start[property] && change.after === end[property]) continue;
    }
    if (property === 'relativeTransform') {
      const start = affine(change.before), end = affine(change.after);
      const group = [change, ...changes.filter(item => {
        const path = parts(item.path);
        return start && end && path[0] === 'nodes' && path[1] === id && path.length === 3 &&
          ((path[2] === 'x' && item.before === start.x && item.after === end.x) ||
           (path[2] === 'y' && item.before === start.y && item.after === end.y));
      })];
      group.forEach(item => consumed.add(item.path));
      result.push({ id: change.path, title: context?.type === 'TEXT' ? 'Положение текста' : context?.type === 'INSTANCE' || context?.type === 'VECTOR' ? 'Положение иконки' : 'Положение слоя',
        nodeId: id, location: location(context, id), before: describeValue(change.before, property), after: describeValue(change.after, property),
        description: positionDescription(change.before, change.after, context), paths: group.map(item => item.path) });
      continue;
    }
    const paintField = property === 'fills' || property === 'fillStyleId' ? 'fills'
      : property === 'strokes' || property === 'strokeStyleId' ? 'strokes' : undefined;
    if (paintField) {
      const styleField = paintField === 'fills' ? 'fillStyleId' : 'strokeStyleId';
      const related = changes.filter(item => {
        const path = parts(item.path);
        return path[0] === 'nodes' && path[1] === id && path[2] === 'properties' &&
          path.length === 4 && [paintField, styleField].includes(path[3]);
      });
      const paints = related.find(item => parts(item.path)[3] === paintField);
      const style = related.find(item => parts(item.path)[3] === styleField);
      // New style definitions are supporting metadata for this exact style assignment.
      // Changes to an existing shared style remain separate, as they can affect other consumers.
      const supporting = changes.filter(item => {
        const path = parts(item.path);
        return style && path[0] === 'styles' && path.length === 2 && item.kind === 'added' && path[1] === style.after;
      });
      const group = [...related, ...supporting];
      group.forEach(item => consumed.add(item.path));
      const before = paints ? paintValue(paints.before) : { text: 'Заливка не изменилась' };
      const after = paints ? paintValue(paints.after) : { text: 'Заливка не изменилась' };
      if (style) { before.style = styleName(style.before); after.style = styleName(style.after); }
      const role = context?.type === 'TEXT' ? 'Цвет текста' : context?.type === 'VECTOR' || context?.type === 'INSTANCE' ? 'Цвет иконки' : context?.variantRoot ? 'Фон кнопки' : 'Заливка слоя';
      result.push({ id: change.path, title: paintField === 'strokes' ? 'Обводка' : role, location: location(context, id),
        nodeId: id, before, after, paths: group.map(item => item.path) });
      continue;
    }
    consumed.add(change.path);
    const wholeNode = segments.length === 2;
    const title = wholeNode ? change.kind === 'added' ? 'Добавлен слой' : change.kind === 'removed' ? 'Удалён слой' : 'Изменён слой'
      : property === 'variantProperties' && segments.length === 5 ? `Значение свойства «${segments[4]}»`
      : fields[property] ?? (segments.includes('textSegments') ? 'Оформление текста' : `Свойство «${property ?? 'данные слоя'}»`);
    const value = (data: unknown) => wholeNode && data !== undefined ? { text: String(object(data).name ?? 'Слой') } : describeValue(data, property);
    result.push({ id: change.path, title, location: location(context, id), nodeId: id,
      before: value(change.before), after: value(change.after), paths: [change.path],
      ...(typeof change.before === 'number' && typeof change.after === 'number' && pixelFields.has(property)
        ? { description: `${title}: ${change.before} → ${change.after} px (${change.after > change.before ? '+' : ''}${rounded(change.after - change.before)} px).` } : {}) });
  }
  for (const change of changes) {
    if (consumed.has(change.path)) continue;
    const [section, id, field] = parts(change.path);
    if (section === 'styles') {
      const group = changes.filter(item => parts(item.path)[0] === section && parts(item.path)[1] === id && !consumed.has(item.path));
      group.forEach(item => consumed.add(item.path));
      const paint = group.find(item => ['paints', 'colors'].includes(parts(item.path)[2]));
      const whole = group.find(item => parts(item.path).length === 2);
      const value = (side: 'before' | 'after') => paint && parts(paint.path)[2] === 'paints' ? paintValue(paint[side]) :
        whole && object(whole[side]).paints ? paintValue(object(whole[side]).paints) : describeValue((whole ?? paint ?? change)[side], field);
      result.push({ id: change.path, title: `Стиль «${styles[id] ?? id}»`, location: 'Стиль Figma', before: value('before'),
        after: value('after'), paths: group.map(item => item.path) });
    } else {
      consumed.add(change.path);
      result.push({ id: change.path, title: section === 'assets' ? 'Геометрия иконки / SVG' : section === 'variables' ? 'Переменные и режимы темы' : 'Структура источника',
        location: section === 'assets' ? location(nodes[id], id) : 'Данные Figma',
        ...(section === 'assets' ? { nodeId: id } : {}), before: change.before === undefined ? describeValue(undefined) : { text: 'Предыдущее значение — см. детали' },
        after: change.after === undefined ? describeValue(undefined) : { text: 'Новое значение — см. детали' }, paths: [change.path] });
    }
  }
  return result;
}
