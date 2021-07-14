import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileUploadUI from './fileuploadui';
import FileUploadEditing from './fileuploadediting';
import Fileuploadprogress from './fileuploadprogress';

export default class FilePlugin extends Plugin {
	static get pluginName() {
		return 'FileUpload';
	}

	static get requires() {
		return [ FileUploadEditing, FileUploadUI, Fileuploadprogress];
	}
}
