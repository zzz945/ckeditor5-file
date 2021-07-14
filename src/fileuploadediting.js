import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import Notification from '@ckeditor/ckeditor5-ui/src/notification/notification';
import Clipboard from '@ckeditor/ckeditor5-clipboard/src/clipboard';
import FileUploadCommand from './fileuploadcommand';
import { toWidget, viewToModelPositionOutsideModelElement } from '@ckeditor/ckeditor5-widget/src/utils';

export default class FileUploadEditing extends Plugin {
	static get requires() {
		return [ FileRepository, Notification, Clipboard ];
	}

	static get pluginName() {
		return 'FileUploadEditing';
	}

	constructor( editor ) {
		super( editor );
	}

  

	init() {
		const editor = this.editor;
		const doc = editor.model.document;
		const schema = editor.model.schema;
    

    this._defineSchema();
    this._defineConverters();

    this.editor.editing.mapper.on(
        'viewToModelPosition',
        viewToModelPositionOutsideModelElement( editor.model, viewElement => viewElement.hasClass( 'file' ) )
    );

		// Register fileUpload command.
		editor.commands.add( 'fileUpload', new FileUploadCommand( editor ) );

		// Handle pasted files.
		this.listenTo( editor.editing.view.document, 'clipboardInput', ( evt, data ) => {
			// Skip if non empty HTML data is included.
			// https://github.com/ckeditor/ckeditor5-upload/issues/68
			if ( isHtmlIncluded( data.dataTransfer ) ) {
				return;
			}

			const files = Array.from( data.dataTransfer.files ).filter( file => {
				// See https://github.com/ckeditor/ckeditor5-image/pull/254.
				return !!file
			} );
      editor.execute( 'fileUpload', { file: files } )
		} );

		// Prevents from the browser redirecting to the dropped file.
		editor.editing.view.document.on( 'dragover', ( evt, data ) => {
			data.preventDefault();
		} );
    
    // Upload placeholder links that appeared in the model.
		// doc.on( 'change', () => {
		// 	const changes = doc.differ.getChanges( { includeChangesInGraveyard: true } );

		// 	for ( const entry of changes ) {
		// 		if ( entry.type == 'insert' && entry.name != '$text' && typeof  entry.position.nodeAfter._attrs.hasOwnProperty('linkHref') ) {
    //       const item = entry.position.nodeAfter;

		// 			const isInGraveyard = entry.position.root.rootName == '$graveyard';

		// 			for ( const modelLink of getLinksFromChangeItem( editor, item ) ) {
		// 				// Check if the link element still has upload id.
		// 				const uploadId = modelLink.getAttribute( 'uploadId' );

		// 				if ( !uploadId ) {
		// 					continue;
		// 				}

    //         const viewFigure = editor.editing.mapper.toViewElement( modelLink );
    //         console.log(editor.editing.mapper, modelLink, viewFigure)

		// 				// Check if the link is loaded on this client.
		// 				const loader = fileRepository.loaders.get( uploadId );

		// 				if ( !loader ) {
		// 					continue;
		// 				}

		// 				if ( isInGraveyard ) {
		// 					// If the link was inserted to the graveyard - abort the loading process.
		// 					loader.abort();
		// 				} else if ( loader.status == 'idle' ) {
		// 					// If the link was inserted into content and has not been loaded yet, start loading it.
		// 					this._readAndUpload( loader, modelLink );
		// 				}
		// 			}
		// 		}
		// 	}
		// });
	}

  _defineSchema() {
    const schema = this.editor.model.schema;

    schema.register( 'file', {
        // Allow wherever text is allowed:
        allowWhere: '$text',

        // The file will act as an inline node:
        isInline: true,

        // The inline widget can have the same attributes as text (for example linkHref, bold).
        allowAttributesOf: '$text',

        // The file can have many types, like date, name, surname, etc:
        allowAttributes: [ 'uploadStatus', 'uploadId', 'name' ]
    } );
  }

  _defineConverters() {
    const conversion = this.editor.conversion;

    conversion.for('upcast').elementToElement( {
      view: {
        name: 'a',
        classes: [ 'file' ]
      },
      model: ( viewElement, { writer: modelWriter } ) => {
        // Extract the "name" from "{name}".
        const linkHref = viewElement.getAttribute('href')
        const textElement = viewElement.getChild(0)

        return modelWriter.createElement( 'file', { linkHref, name: textElement.data } );
      }
    });

    conversion.for( 'editingDowncast' ).elementToElement( {
        model: 'file',
        view: ( modelItem, { writer: viewWriter } ) => {
            const widgetElement = createFileView( modelItem, viewWriter );

            // Enable widget handling on a file element inside the editing view.
            return toWidget( widgetElement, viewWriter );
        }
    } );

    conversion.for( 'dataDowncast' ).elementToElement( {
        model: 'file',
        view: ( modelItem, { writer: viewWriter } ) => createFileView( modelItem, viewWriter )
    } );

    // Helper method for both downcast converters.
    function createFileView( modelItem, viewWriter ) {
        const linkHref = modelItem.getAttribute( 'linkHref' );
        const name = modelItem.getAttribute( 'name' );
        const fileView = viewWriter.createContainerElement( 'a', {
          class: 'file'
        }, {
          isAllowedInsideAttributeElement: true
        });

        // Insert the file name (as a text).
        const innerText = viewWriter.createText(name);
        viewWriter.setAttribute('href', linkHref, fileView)
        viewWriter.insert( viewWriter.createPositionAt( fileView, 0 ), innerText );

        return fileView;
    }
}  
}

// Returns `true` if non-empty `text/html` is included in the data transfer.
//
// @param {module:clipboard/datatransfer~DataTransfer} dataTransfer
// @returns {Boolean}
export function isHtmlIncluded( dataTransfer ) {
	return Array.from( dataTransfer.types ).includes( 'text/html' ) && dataTransfer.getData( 'text/html' ) !== '';
}

function getLinksFromChangeItem( editor, item ) {
	return Array.from( editor.model.createRangeOn( item ) ).map( value => value.item );
}
