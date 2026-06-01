import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Icon,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { getAllEntries, deleteEntry, saveEntry } from "./storage";
import { ValueEntry, ValueType } from "./types";
import { formatRelativeTime, getErrorMessage, truncateValue } from "./utils";
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

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments?.query ?? "");
  const { isLoading, data: entries, error, revalidate } = usePromise(getAllEntries, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load values",
        message: getErrorMessage(error),
      });
    }
  }, [error]);

  const handleDelete = useCallback(
    async (id: string, label: string) => {
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
          message: getErrorMessage(e),
        });
      }
    },
    [revalidate],
  );

  const handleDuplicate = useCallback(
    async (entry: ValueEntry) => {
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
          message: getErrorMessage(e),
        });
      }
    },
    [revalidate],
  );

  const sortedEntries = useMemo(
    () => (entries ? [...entries].sort((a, b) => b.updatedAt - a.updatedAt) : []),
    [entries],
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
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
                    icon={Icon.Duplicate}
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
