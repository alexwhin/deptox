import { Text, TextVariant, TextIntent } from "./Typography";
import { cn } from "../utilities/cn";

interface FormFieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  last?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  hint,
  htmlFor,
  last = false,
  children,
}: FormFieldProps): React.ReactElement {
  const labelContent = (
    <div className="mb-2 flex items-baseline gap-2">
      <Text
        variant={TextVariant.CAPTION}
        intent={TextIntent.DEFAULT}
        className="font-semibold"
      >
        {label}
      </Text>
      {hint && (
        <Text variant={TextVariant.CAPTION} intent={TextIntent.MUTED}>
          {hint}
        </Text>
      )}
    </div>
  );

  return (
    <div className={cn(!last && "mb-4")}>
      {htmlFor ? <label htmlFor={htmlFor}>{labelContent}</label> : labelContent}
      {children}
    </div>
  );
}
