import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileDialogButtonView from '@ckeditor/ckeditor5-upload/src/ui/filedialogbuttonview';
import fileIcon from './file.svg';

/**
 * The file upload button plugin.
 */
export default class FileUploadUI extends Plugin {
	static get pluginName() {
		return 'FileUploadUI';
	}

	init() {
		const editor = this.editor;

		editor.ui.componentFactory.add( 'fileUpload', locale => {
			return this._createFileDialogButtonView( locale );
		});
	}
  
	/**
	 * Creates and sets up the file dialog button view.
	 *
	 * @param {module:utils/locale~Locale} locale The localization services instance.
	 *
	 * @private
	 * @returns {module:upload/ui/filedialogbuttonview~FileDialogButtonView}
	 */
	_createFileDialogButtonView( locale ) {
		const editor = this.editor;
		const t = locale.t;
		const fileDialogButtonView = new FileDialogButtonView( locale );
		const command = editor.commands.get( 'fileUpload' );

		fileDialogButtonView.buttonView.set( {
			label: t( 'Insert file' ), // TODO: missing translation
			icon: fileIcon,
			tooltip: true
		} );

		fileDialogButtonView.buttonView.bind( 'isEnabled' ).to( command );

		fileDialogButtonView.on( 'done', ( evt, files ) => {
			const filesToUpload = Array.from( files );

			if ( filesToUpload.length ) {
				editor.execute( 'fileUpload', { file: filesToUpload } );
			}
		} );

		return fileDialogButtonView;
	}
}
