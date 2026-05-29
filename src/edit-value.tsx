import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { updateEntry } from "./storage";
import { ValueEntry, detectType, parseValueType, VALUE_TYPE_OPTIONS } from "./types";

interface EditFormValues {
  label: string;
  value: string;
  type: string;
}

interface Props {
  entry: ValueEntry;
  onUpdate?: () => void;
}

export default function EditValueForm({ entry, onUpdate }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<EditFormValues>({
    onSubmit: async (formValues) => {
      const parsedType = parseValueType(formValues.type);
      if (!parsedType) {
        showToast({ style: Toast.Style.Failure, title: "Invalid type selected" });
        return;
      }
      try {
        const updated: ValueEntry = {
          ...entry,
          label: formValues.label.trim(),
          value: formValues.value.trim(),
          type: parsedType,
          updatedAt: Date.now(),
        };
        await updateEntry(updated);
        onUpdate?.();
        showToast({ style: Toast.Style.Success, title: "Value updated" });
        pop();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to update value",
          message: String(e),
        });
      }
    },
    validation: {
      label: FormValidation.Required,
      value: FormValidation.Required,
    },
    initialValues: {
      label: entry.label,
      value: entry.value,
      type: entry.type,
    },
  });

  const detectedType = values.value ? detectType(values.value) : null;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Edit Value"
    >
      <Form.TextField
        title="Label"
        placeholder="e.g. Production API Key"
        autoFocus
        {...itemProps.label}
      />
      <Form.TextArea
        title="Value"
        placeholder="Paste or type the value to store..."
        {...itemProps.value}
      />
      <Form.Dropdown
        title="Type"
        info={
          detectedType && detectedType !== parseValueType(values.type)
            ? `Detected type: ${detectedType}`
            : undefined
        }
        {...itemProps.type}
      >
        {VALUE_TYPE_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.label} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
