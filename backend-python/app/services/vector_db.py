"""Pillar 3: Vector DB for RAG (ChromaDB)."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter


class StrategyKnowledgeBase:
    """Store and retrieve strategy patterns for RAG."""

    def __init__(self, persist_directory: str = "./chroma_db") -> None:
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        self._embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
        )
        self._persist = persist_directory
        self._collection = Chroma(
            collection_name="strategy_patterns",
            embedding_function=self._embeddings,
            persist_directory=persist_directory,
        )
        self._splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    def add_strategy_patterns(self, strategies: list[dict[str, Any]]) -> None:
        """Add historical strategies to the knowledge base."""
        documents = []
        metadatas = []
        for s in strategies:
            doc = (
                f"Strategy Name: {s.get('name', '')}\n"
                f"Type: {s.get('type', '')}\n"
                f"Entry: {s.get('entry_rules', [])}\n"
                f"Exit: {s.get('exit_rules', [])}\n"
                f"Performance Sharpe={s.get('sharpe', '')} Returns={s.get('returns', '')}\n"
                f"Regime: {s.get('market_regime', '')}\n"
                f"Risk: {s.get('risk_level', '')}"
            )
            documents.append(doc)
            metadatas.append({
                "strategy_id": str(s.get("id", "")),
                "sharpe_ratio": str(s.get("sharpe", "")),
                "market_regime": s.get("market_regime", ""),
            })
        chunks_docs = []
        chunks_meta = []
        for doc, meta in zip(documents, metadatas):
            for chunk in self._splitter.split_text(doc):
                chunks_docs.append(chunk)
                chunks_meta.append(meta)
        if chunks_docs:
            self._collection.add_texts(chunks_docs, metadatas=chunks_meta)
            self._collection.persist()

    def retrieve_similar_strategies(self, query: str, k: int = 5) -> list[dict[str, Any]]:
        """Return similar strategy chunks."""
        try:
            results = self._collection.similarity_search_with_score(query, k=k)
            return [
                {"content": doc.page_content, "metadata": doc.metadata, "score": float(score)}
                for doc, score in results
            ]
        except Exception:
            return []
