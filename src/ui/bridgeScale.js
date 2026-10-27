/**
 * Échelle horizontale du pont de calcul : convertit une valeur en position (%) dans la piste.
 * Le zéro n'est à gauche que si aucune valeur n'est négative ; avec la revente, une étape
 * intermédiaire peut passer sous zéro et doit rester dans la piste.
 */
export function bridgeScale(values) {
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return v => ((v - min) / span) * 100;
}
