import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { getAllEntries, deleteEntry, saveEntry } from "./storage";
import { ValueEntry, ValueType } from "./types";
import AddValueForm from "./add-value";
import EditValueForm from "./edit-value";

const TYPE_ICONS: Record<ValueType, { icon: Icon; color: Color }> = {
  string: { icon: Icon.Text, color: Color.PrimaryText },
  number: { icon: Icon.Hashtag, color: Color.Blue },
  url: { icon: Icon.Link, color: Color.Blue },
  email: { icon: Icon.Envelope, color: Color.Magenta },
  json: { icon: Icon.Code, color: Color.Orange },
  color: { icon: Icon.EyeDropper, color: Color.Yellow },
};

const TYPE_NAMES: Record<ValueType, string> = {
  string: "string",
  number: "number",
  url: "URL",
  email: "email",
  json: "JSON",
  color: "color",
};

function truncateValue(value: string, maxLength = 100): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + "...";
}

function formatRelativeTime(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function Command() {
  const { isLoading, data: entries, error, revalidate } = usePromise(getAllEntries, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load values",
        message: String(error),
      });
    }
  }, [error]);

  async function handleDelete(id: string, label: string) {
    const confirmed = await confirmAlert({
      title: "Delete Value",
      message: `Are you sure you want to delete "${label}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteEntry(id);
      revalidate();
      showHUD("Value deleted");
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete value",
        message: String(e),
      });
    }
  }

  async function handleDuplicate(entry: ValueEntry) {
    try {
      const newEntry: ValueEntry = {
        id: uuidv4(),
        label: `${entry.label} (copy)`,
        value: entry.value,
        type: entry.type,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveEntry(newEntry);
      revalidate();
      showHUD("Value duplicated");
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to duplicate value",
        message: String(e),
      });
    }
  }

  const sortedEntries = entries ? [...entries].sort((a, b) => b.updatedAt - a.updatedAt) : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search values..."
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add Value"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={<AddValueForm onSave={revalidate} />}
          />
        </ActionPanel>
      }
    >
      {sortedEntries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No values yet"
          description="Press ⌘N to add your first value."
        />
      ) : (
        sortedEntries.map((entry) => {
          const typeInfo = TYPE_ICONS[entry.type];
          return (
            <List.Item
              key={entry.id}
              title={entry.label}
              subtitle={truncateValue(entry.value)}
              icon={{ source: typeInfo.icon, tintColor: typeInfo.color }}
              accessories={[
                { tag: { value: TYPE_NAMES[entry.type], color: typeInfo.color } },
                { text: formatRelativeTime(entry.updatedAt) },
              ]}
              keywords={[entry.value]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.Clipboard}
                    title="Copy Value"
                    onAction={() => {
                      Clipboard.copy(entry.value);
                      showHUD("Copied!");
                    }}
                  />
                  <Action
                    icon={Icon.Terminal}
                    title="Paste Value"
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => {
                      Clipboard.paste(entry.value);
                      showHUD("Pasted!");
                    }}
                  />
                  <Action
                    icon={Icon.CopyClipboard}
                    title="Copy as JSON"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => {
                      const json = JSON.stringify(
                        { label: entry.label, value: entry.value, type: entry.type },
                        null,
                        2,
                      );
                      Clipboard.copy(json);
                      showHUD("Copied as JSON!");
                    }}
                  />
                  <Action.Push
                    icon={Icon.Pencil}
                    title="Edit Value"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditValueForm entry={entry} onUpdate={revalidate} />}
                  />
                  <Action
                    icon={Icon.Copy}
                    title="Duplicate"
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleDuplicate(entry)}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Value"
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => handleDelete(entry.id, entry.label)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
