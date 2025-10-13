const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

export function transposeChord(chord: string, semitones: number): string {
  if (!chord) return chord

  // Extract the root note and the rest of the chord
  const match = chord.match(/^([A-G][#b]?)(.*)/)
  if (!match) return chord

  let [, root, suffix] = match

  // Convert flat to sharp
  if (root.includes("b")) {
    const noteIndex = NOTES.indexOf(root.replace("b", ""))
    root = NOTES[(noteIndex - 1 + 12) % 12]
  }

  // Find current position
  const currentIndex = NOTES.indexOf(root)
  if (currentIndex === -1) return chord

  // Calculate new position
  const newIndex = (currentIndex + semitones + 12) % 12
  const newRoot = NOTES[newIndex]

  return newRoot + suffix
}

export function transposeChords(chords: string[], semitones: number): string[] {
  return chords.map((chord) => transposeChord(chord, semitones))
}
