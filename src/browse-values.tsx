import {
  Action,
  ActionPanel,
  Alert,
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
import { ValueEntry } from "./types";
import { getErrorMessage } from "./utils";
import { ValueListItem } from "./value-list-item";
import AddValueForm from "./add-value";

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments?.query ?? "");
  const [isMutating, setIsMutating] = useState(false);
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
      setIsMutating(true);
      try {
        await deleteEntry(id);
        await revalidate();
        showHUD("Value deleted");
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete value",
          message: getErrorMessage(e),
        });
      } finally {
        setIsMutating(false);
      }
    },
    [revalidate],
  );

  const handleDuplicate = useCallback(
    async (entry: ValueEntry) => {
      setIsMutating(true);
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
        await revalidate();
        showHUD("Value duplicated");
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to duplicate value",
          message: getErrorMessage(e),
        });
      } finally {
        setIsMutating(false);
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
      isLoading={isLoading || isMutating}
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
        sortedEntries.map((entry) => (
          <ValueListItem
            key={entry.id}
            entry={entry}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUpdate={revalidate}
          />
        ))
      )}
    </List>
  );
}
