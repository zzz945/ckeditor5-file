import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';
import Command from '@ckeditor/ckeditor5-core/src/command';
import Notification from '@ckeditor/ckeditor5-ui/src/notification/notification';

export default class FileUploadCommand extends Command {
	refresh() {
		this.isEnabled = true;
	}

	execute( options ) {
		const editor = this.editor;
		const fileRepository = editor.plugins.get( FileRepository );
    const filesToUpload = Array.isArray( options.file ) ? options.file : [ options.file ];

    for ( const file of filesToUpload ) {
      this.uploadFile( fileRepository, file );
    }
  }
  
  // Handles uploading single file.
  uploadFile( fileRepository, file ) {
    const loader = fileRepository.createLoader( file );

    // Do not throw when upload adapter is not set. FileRepository will log an error anyway.
    if ( !loader ) {
      return;
    }

    this.insertFile(file, fileRepository, loader)
  }
  
  insertFile(file, fileRepository, loader ) {
    const editor = this.editor;
    const t = editor.locale.t;
    const notification = editor.plugins.get( Notification );

    let linkNode
    editor.model.change( writer => {
      const selection = editor.model.document.selection;
      const position = selection.getFirstPosition();
      linkNode = writer.createElement( 'file', {
        name: file.name,
        linkHref: '',
        linkIsDownloadable: true,
        uploadId: loader.id,
      });

      editor.model.insertContent( linkNode, position );

      // editor.editing.view.change( viewWriter => {
      //   const progressBar = viewWriter.createUIElement( 'div', { class: 'ck-progress-bar' } );
      //   // writer.setCustomProperty( 'progressBar', true, progressBar );
      //   const viewLink = editor.editing.mapper.toViewElement( linkNode );

      //   viewWriter.insert( viewWriter.createPositionAt( viewLink, 'end' ), progressBar );

      //   // Update progress bar width when uploadedPercent is changed.
      //   loader.on( 'change:uploadedPercent', ( evt, name, value ) => {

      //     viewWriter.setStyle( 'width', value + '%', progressBar );

      //     console.log(value)
      //   });
      // });
    }) 

    return loader.read().then(() => {
      const promise = loader.upload()

      editor.model.enqueueChange( 'transparent', writer => {
        writer.setAttribute( 'uploadStatus', 'uploading', linkNode );
      } );

      return promise
    })
      .then( ({ default: linkHref, fileName }) => {
        editor.model.change( writer => {
           writer.setAttribute( 'linkHref', linkHref, linkNode)
           writer.setAttribute( 'uploadStatus', 'complete', linkNode)
        })        
        clean();
      } )
      .catch( error => {
        // If status is not 'error' nor 'aborted' - throw error because it means that something else went wrong,
        // it might be generic error and it would be real pain to find what is going on.
        if ( loader.status !== 'error' && loader.status !== 'aborted' ) {
          throw error;
        }

        // Might be 'aborted'.
        if ( loader.status == 'error' && error ) {
          notification.showWarning( error, {
            title: t( 'Upload failed' ),
            namespace: 'upload'
          } );
        }

        clean();
      } );

    function clean() {
      editor.model.enqueueChange( 'transparent', writer => {
				writer.removeAttribute( 'uploadId', linkNode );
				writer.removeAttribute( 'uploadStatus', linkNode );
			} );

      fileRepository.destroyLoader( loader );
    }
  } 
}

