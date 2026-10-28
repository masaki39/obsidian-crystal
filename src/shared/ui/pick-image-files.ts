/**
 * Open the OS file picker for images. `onPick` runs once the user confirms a
 * selection (it never runs when the dialog is cancelled).
 */
export function pickImageFiles(multiple: boolean, onPick: (files: File[]) => void): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.multiple = multiple;
	input.addEventListener('change', () => onPick(Array.from(input.files || [])));
	input.click();
}
