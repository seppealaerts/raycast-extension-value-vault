import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveEntry } from "./storage";
import { ValueEntry, detectType, parseValueType, VALUE_TYPE_OPTIONS } from "./types";

interface AddFormValues {
  label: string;
  value: string;
  type: string;
}

interface Props {
  onSave?: () => void;
}

export default function AddValueForm({ onSave }: Props) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values } = useForm<AddFormValues>({
    onSubmit: async (formValues) => {
      const parsedType = parseValueType(formValues.type);
      if (!parsedType) {
        showToast({ style: Toast.Style.Failure, title: "Invalid type selected" });
        return;
      }
      try {
        const now = Date.now();
        const entry: ValueEntry = {
          id: uuidv4(),
          label: formValues.label.trim(),
          value: formValues.value.trim(),
          type: parsedType,
          createdAt: now,
          updatedAt: now,
        };
        await saveEntry(entry);
        onSave?.();
        showToast({ style: Toast.Style.Success, title: "Value saved" });
        pop();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to save value",
          message: String(e),
        });
      }
    },
    validation: {
      label: FormValidation.Required,
      value: FormValidation.Required,
    },
    initialValues: {
      label: "",
      value: "",
      type: "string",
    },
  });

  const detectedType = values.value ? detectType(values.value) : null;

  useEffect(() => {
    if (detectedType && detectedType !== parseValueType(values.type)) {
      itemProps.type.onChange?.(detectedType);
    }
  }, [detectedType, values.type]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Value" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Add Value"
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
