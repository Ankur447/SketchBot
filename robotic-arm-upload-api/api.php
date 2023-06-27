<?php
session_start();
$message = '';
if (isset($_FILES['uploaded_svg']) && isset($_POST['sketchbot'])) {
    $fileTmpPath = $_FILES['uploaded_svg']['tmp_name'];
    $fileName = $_FILES['uploaded_svg']['name'];
    $fileSize = $_FILES['uploaded_svg']['size'];
    $fileType = $_FILES['uploaded_svg']['type'];
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    $allowedfileExtensions = array('svg');
    if (in_array($fileExtension, $allowedfileExtensions)) {
        // directory in which the uploaded file will be moved
        $uploadFileDir = './sketchbot_' . $_POST['sketchbot'] . '/';
        $dest_path = $uploadFileDir . $fileName;
        if (move_uploaded_file($fileTmpPath, $dest_path)) {
            $message = 'File successfully uploaded.';
        } else {
            $message = 'There was some error moving the file to upload directory. Please make sure the upload directory is writable by web server.';
        }
    } else {
        $message = 'Upload failed. Allowed file types: ' . implode(',', $allowedfileExtensions);
    }
} else {
    $message = 'There is some error in the file upload. Please check the following error.<br>';
    $message .= 'Error:' . $_FILES['uploadedFile']['error'];
}
echo $message;
