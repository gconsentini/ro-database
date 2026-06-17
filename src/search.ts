// ---------------------------------------------------------------------------
// Busca textual "fuzzy" com tolerancia a erros de digitacao via pg_trgm.
//
// Os SELECTs das rotas ja inlineiam SQL com parametros posicionais, entao em
// vez de um query builder pesado, este helper devolve os fragmentos de SQL
// (WHERE + ranking) que cada rota intercala no seu proprio comando.
// ---------------------------------------------------------------------------

export interface FuzzyFragment {
  /** Condicao booleana: casa por substring (ILIKE) OU por similaridade (%). */
  where: string;
  /** Expressao 0..1 para ORDER BY; quanto maior, mais relevante. */
  rank: string;
  /** Valor a ser passado como parametro $index (termo ja normalizado). */
  value: string;
}

/**
 * Gera os fragmentos de busca fuzzy para um conjunto de colunas textuais.
 *
 * @param cols  expressoes SQL ja resolvidas para texto, ex.:
 *              ["lower(i.aegis_name)", "lower(coalesce(t.name, ''))"]
 * @param term  termo de busca cru vindo do cliente
 * @param index numero do parametro posicional ($index) que recebera o termo
 *
 * Combina duas estrategias:
 *  - `coluna ILIKE '%termo%'` pega correspondencias por substring exata;
 *  - `coluna % termo` (pg_trgm) pega aproximacoes ("porin" -> "poring").
 * O ranking usa a maior similaridade entre as colunas.
 */
export function fuzzyClause(
  cols: string[],
  term: string,
  index: number,
): FuzzyFragment {
  const p = `$${index}`;
  const like = cols.map((c) => `${c} LIKE '%' || ${p} || '%'`);
  const sim = cols.map((c) => `${c} % ${p}`);
  const where = `(${[...like, ...sim].join(" OR ")})`;
  const rank = `GREATEST(${cols.map((c) => `similarity(${c}, ${p})`).join(", ")})`;
  return { where, rank, value: term.toLowerCase() };
}
