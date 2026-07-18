"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CardDetailSheet } from "@/components/kanban/card-detail-sheet";
import { useBoardData, useBoardRealtime } from "@/hooks/use-board";

type SelectedCardContextValue = {
  selectedCardId: string | null;
  openCard: (cardId: string) => void;
  closeCard: () => void;
};

const SelectedCardContext = createContext<SelectedCardContextValue | null>(
  null
);

export function SelectedCardProvider({ children }: { children: ReactNode }) {
  useBoardRealtime();
  const { columns, cards, checklist } = useBoardData();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const openCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const closeCard = useCallback(() => {
    setSelectedCardId(null);
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const value = useMemo(
    () => ({ selectedCardId, openCard, closeCard }),
    [selectedCardId, openCard, closeCard]
  );

  return (
    <SelectedCardContext.Provider value={value}>
      {children}
      <CardDetailSheet
        card={selectedCard}
        columns={columns}
        checklist={checklist.filter((i) => i.card_id === selectedCardId)}
        open={!!selectedCardId}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null);
        }}
      />
    </SelectedCardContext.Provider>
  );
}

export function useSelectedCard() {
  const ctx = useContext(SelectedCardContext);
  if (!ctx) {
    throw new Error("useSelectedCard must be used within SelectedCardProvider");
  }
  return ctx;
}
