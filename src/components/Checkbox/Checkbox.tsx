import { useLayoutEffect, useRef, useImperativeHandle, type ComponentPropsWithRef, type ReactNode } from 'react';
import styles from './Checkbox.module.css';
import '../../styles/checkbox-tokens.css';

export type CheckboxProps = Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> & {
  children?: ReactNode;
  indeterminate?: boolean;
};

export function Checkbox({ children, indeterminate = false, ref, className, ...inputProps }: CheckboxProps) {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current!, []);
  useLayoutEffect(() => { if (input.current) input.current.indeterminate = indeterminate; }, [indeterminate]);
  const hasLabel = children != null && children !== '' && children !== false;
  return <label className={[styles.checkbox, className].filter(Boolean).join(' ')} data-checkbox data-has-label={hasLabel}>
    <span className={styles.control}>
      <input {...inputProps} ref={input} type="checkbox" className={styles.input} />
      <span aria-hidden="true" data-checkbox-visual="empty" className={[styles.visual, styles.empty].join(' ')} />
      <span aria-hidden="true" data-checkbox-visual="selected" className={[styles.visual, styles.selected].join(' ')} />
      <span aria-hidden="true" data-checkbox-visual="mixed" className={[styles.visual, styles.mixed].join(' ')} />
    </span>
    {hasLabel && <span className={styles.label}>{children}</span>}
  </label>;
}

export function CheckboxSkeleton({ className, label = 'Загрузка' }: { className?: string; label?: string }) {
  return <span className={[styles.checkbox, className].filter(Boolean).join(' ')} data-checkbox data-has-label="true" role="status" aria-label={label} aria-busy="true">
    <span className={styles.skeletonIcon} aria-hidden="true" />
    <span className={styles.placeholder} aria-hidden="true" />
  </span>;
}

export function CheckboxGroup({ label, children, className, ...props }: Omit<ComponentPropsWithRef<'fieldset'>, 'children'> & { label: ReactNode; children: ReactNode }) {
  return <fieldset {...props} className={[styles.group, className].filter(Boolean).join(' ')}>
    <legend className={styles.legend}>{label}</legend>
    <div className={styles.items}>{children}</div>
  </fieldset>;
}
