/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals setTimeout */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import FileRepository from '@ckeditor/ckeditor5-upload/src/filerepository';

import './fileuploadprogress.css';

/**
 * The file upload progress plugin.
 *
 * @extends module:core/plugin~Plugin
 */
export default class FileUploadProgress extends Plugin {
	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );

	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;

		// Upload status change - update file's view according to that status.
		editor.editing.downcastDispatcher.on( 'attribute:uploadStatus:file', ( ...args ) => this.uploadStatusChange( ...args ) );
	}

	/**
	 * This method is called each time the file `uploadStatus` attribute is changed.
	 *
	 * @param {module:utils/eventinfo~EventInfo} evt An object containing information about the fired event.
	 * @param {Object} data Additional information about the change.
	 * @param {module:engine/conversion/downcastdispatcher~DowncastConversionApi} conversionApi
	 */
	uploadStatusChange( evt, data, conversionApi ) {
		const editor = this.editor;
		const modelLink = data.item;
		const uploadId = modelLink.getAttribute( 'uploadId' );

		if ( !conversionApi.consumable.consume( modelLink, evt.name ) ) {
			return;
		}

		const fileRepository = editor.plugins.get( FileRepository );
		const status = data.attributeNewValue
		const viewFigure = editor.editing.mapper.toViewElement( modelLink );

		const viewWriter = conversionApi.writer;

		// Show progress bar on the top of the file when file is uploading.
		if ( status == 'uploading' ) {
			const loader = fileRepository.loaders.get( uploadId );

			// Start appear effect if needed - see https://github.com/ckeditor/ckeditor5-image/issues/191.
			_startAppearEffect( viewFigure, viewWriter );
			_showProgressBar( viewFigure, viewWriter, loader, editor.editing.view );

			return;
		}

		if ( status == 'complete' && fileRepository.loaders.get( uploadId ) ) {
			_showCompleteIcon( viewFigure, viewWriter, editor.editing.view );
		}

		// Clean up.
		_hideProgressBar( viewFigure, viewWriter );
		_stopAppearEffect( viewFigure, viewWriter );
	}
}

// Adds ck-appear class to the file if one is not already applied.
//
// @param {module:engine/view/containerelement~ContainerElement} viewFigure
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
function _startAppearEffect( viewFigure, writer ) {
	if ( !viewFigure.hasClass( 'ck-appear' ) ) {
		writer.addClass( 'ck-appear', viewFigure );
	}
}

// Removes ck-appear class to the image figure if one is not already removed.
//
// @param {module:engine/view/containerelement~ContainerElement} viewFigure
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
function _stopAppearEffect( viewFigure, writer ) {
	writer.removeClass( 'ck-appear', viewFigure );
}

// Shows progress bar displaying upload progress.
// Attaches it to the file loader to update when upload percentace is changed.
//
// @param {module:engine/view/containerelement~ContainerElement} viewFigure
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
// @param {module:upload/filerepository~FileLoader} loader
// @param {module:engine/view/view~View} view
function _showProgressBar( viewFigure, writer, loader, view ) {
	const progressBar = _createProgressBar( writer );
	writer.insert( writer.createPositionAt( viewFigure, 'end' ), progressBar );

	// Update progress bar width when uploadedPercent is changed.
	loader.on( 'change:uploadedPercent', ( evt, name, value ) => {
		view.change( writer => {
			writer.setStyle( 'width', value + '%', progressBar );
		} );
	} );
}

// Hides upload progress bar.
//
// @param {module:engine/view/containerelement~ContainerElement} viewFigure
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
function _hideProgressBar( viewFigure, writer ) {
	_removeUIElement( viewFigure, writer, 'progressBar' );
}

// Shows complete icon and hides after a certain amount of time.
//
// @param {module:engine/view/containerelement~ContainerElement} viewFigure
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
// @param {module:engine/view/view~View} view
function _showCompleteIcon( viewFigure, writer, view ) {
	const completeIcon = writer.createUIElement( 'div', { class: 'ck-image-upload-complete-icon' } );

	writer.insert( writer.createPositionAt( viewFigure, 'end' ), completeIcon );

	setTimeout( () => {
		view.change( writer => writer.remove( writer.createRangeOn( completeIcon ) ) );
	}, 3000 );
}

// Create progress bar element using {@link module:engine/view/uielement~UIElement}.
//
// @private
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
// @returns {module:engine/view/uielement~UIElement}
function _createProgressBar( writer ) {
	const progressBar = writer.createUIElement( 'div', { class: 'ck-progress-bar' } );

	writer.setCustomProperty( 'progressBar', true, progressBar );

	return progressBar;
}

// Returns {@link module:engine/view/uielement~UIElement} of given unique property from file element.
// Returns `undefined` if element is not found.
//
// @private
// @param {module:engine/view/element~Element} viewFigure
// @param {String} uniqueProperty
// @returns {module:engine/view/uielement~UIElement|undefined}
function _getUIElement( viewFigure, uniqueProperty ) {
	for ( const child of viewFigure.getChildren() ) {
		if (child.is('element', 'div') && child.hasClass('ck-progress-bar')) {
			return child;
		}
	}
}

// Removes {@link module:engine/view/uielement~UIElement} of given unique property from file element.
//
// @private
// @param {module:engine/view/element~Element} fileLink
// @param {module:engine/view/downcastwriter~DowncastWriter} writer
// @param {String} uniqueProperty
function _removeUIElement( viewFigure, writer, uniqueProperty ) {
	const element = _getUIElement( viewFigure, uniqueProperty );

	if ( element ) {
		writer.remove( writer.createRangeOn( element ) );
	}
}
